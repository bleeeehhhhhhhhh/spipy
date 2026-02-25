# 🌸 Spipy + Supabase Setup Guide

Your website is now configured to use Supabase for online data storage! Here's what to do:

## Step 1: Create the Database Table

1. Go to your Supabase Dashboard: https://app.supabase.com/
2. Click on your project: **Spipy**
3. Go to the **SQL Editor** (left sidebar)
4. Click **+ New Query**
5. Copy & paste the entire contents of `SUPABASE_SETUP.sql`
6. Click the **Play** button (or Run) to execute the SQL
7. You should see: "Success. No rows returned."

## Step 2: Test Your App

1. Open `index.html` in your browser (or run with `npm start`)
2. Try creating a post (note, song, or photo)
3. The post should appear on the feed
4. **Reload the page** - your post should still be there! ✅

## Step 3: View Your Data

- Go to Supabase Dashboard > **Table Editor**
- You should see your `posts` table with your created posts
- All posts are stored in the cloud! 🎉

## How It Works

- **Everyone** visiting your site now sees the **same posts**
- Posts are stored in Supabase, not just on your browser
- When someone adds/deletes/reacts to a post, it updates instantly for everyone
- Images are stored as **base64** in the database (works great for small projects!)

## Troubleshooting

### "Can't see the posts I created"
- Make sure you ran the SQL setup script
- Check your browser's Console (F12) for errors
- Verify Supabase URL and Key are correct in `supabase-config.js`

### "Error: Table 'posts' does not exist"
- You didn't run the SQL script, or it failed
- Go back to Step 1 and try again

### "Real-time updates not working"
- Real-time features are built-in! Just make sure Row Level Security is enabled (the SQL script does this)

## Project Structure

```
hhihi/
├── index.html              (Main page)
├── package.json            
├── SUPABASE_SETUP.sql      (Database creation script - run once!)
├── css/
│   └── style.css          
├── js/
│   ├── app.js             (Updated for Supabase!)
│   └── supabase-config.js (Supabase credentials & functions)
```

## Your Credentials

**Project URL:** https://pnihqpsppbfuzvrlmzgc.supabase.co  
**Anon Key:** (Securely stored in `supabase-config.js`)

## Next Steps (Optional)

- **Deploy your site** to Vercel, Netlify, or GitHub Pages
- **Add authentication** (let users login and manage their own posts)
- **Store images properly** (use Supabase Storage instead of base64)
- **Add more features** (comments, likes from specific users, etc.)

## Questions?

Check Supabase docs: https://supabase.com/docs  
Or join their community Discord!

---

Made with 🩷 by your Spipy Team ✿
