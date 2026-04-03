-- ============================================
-- COMPLETE FIX: Run this to fix ALL messaging issues
-- Paste this ENTIRE script in Supabase SQL Editor and click Run
-- ============================================

-- Step 1: Drop ALL old broken policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view participants of own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can read messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Step 2: Create SECURITY DEFINER functions (bypass RLS to prevent recursion)
CREATE OR REPLACE FUNCTION is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_conversation_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 3: Create a function that creates conversation + adds participants atomically
-- This bypasses RLS so there's no chicken-and-egg problem
CREATE OR REPLACE FUNCTION create_dm_conversation(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
  existing_conv_id UUID;
  new_conv_id UUID;
BEGIN
  -- First check if conversation already exists
  SELECT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = p_user1_id
    AND cp2.user_id = p_user2_id
    AND (
      SELECT COUNT(*) FROM conversation_participants cp3
      WHERE cp3.conversation_id = cp1.conversation_id
    ) = 2;

  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO new_conv_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (new_conv_id, p_user1_id), (new_conv_id, p_user2_id);

  RETURN new_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create FIXED RLS policies

-- Conversations
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (id IN (SELECT get_user_conversation_ids(auth.uid())));

CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  USING (is_conversation_member(id, auth.uid()));

-- Conversation Participants (uses security definer - no recursion)
CREATE POLICY "Users can view participants of own conversations"
  ON conversation_participants FOR SELECT
  USING (conversation_id IN (SELECT get_user_conversation_ids(auth.uid())));

CREATE POLICY "Authenticated users can add participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own participation"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Messages
CREATE POLICY "Users can read messages in own conversations"
  ON messages FOR SELECT
  USING (conversation_id IN (SELECT get_user_conversation_ids(auth.uid())));

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND is_conversation_member(conversation_id, auth.uid())
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- Step 5: Helper functions
CREATE OR REPLACE FUNCTION find_dm_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user1_id
    AND cp2.user_id = user2_id
    AND (
      SELECT COUNT(*) FROM conversation_participants cp3
      WHERE cp3.conversation_id = cp1.conversation_id
    ) = 2;
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT '',
  p_link TEXT DEFAULT '',
  p_sender_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notif_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link, sender_id, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, p_sender_id, p_metadata)
  RETURNING id INTO notif_id;
  RETURN notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  sender_name TEXT;
  msg_preview TEXT;
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;

  SELECT COALESCE(display_name, username, 'Someone') INTO sender_name
  FROM profiles WHERE id = NEW.sender_id;

  msg_preview := LEFT(NEW.content, 100);

  FOR participant IN
    SELECT user_id FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
  LOOP
    PERFORM create_notification(
      participant.user_id,
      'message',
      sender_name || ' sent you a message',
      msg_preview,
      '/messages/' || NEW.conversation_id,
      NEW.sender_id,
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
    );
  END LOOP;

  IF array_length(NEW.mentions, 1) > 0 THEN
    FOR participant IN
      SELECT unnest(NEW.mentions) AS user_id
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = NEW.conversation_id
        AND user_id = participant.user_id
        AND participant.user_id != NEW.sender_id
      ) THEN
        PERFORM create_notification(
          participant.user_id,
          'mention',
          sender_name || ' mentioned you',
          msg_preview,
          '/messages/' || NEW.conversation_id,
          NEW.sender_id,
          jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
        );
      ELSE
        UPDATE notifications
        SET type = 'mention', title = sender_name || ' mentioned you'
        WHERE user_id = participant.user_id
        AND sender_id = NEW.sender_id
        AND metadata->>'message_id' = NEW.id::text;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION handle_new_message();

-- Step 6: Enable Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ALL DONE! Messaging will now work.
