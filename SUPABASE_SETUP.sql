-- Create posts table for Spipy
-- Run this in Supabase SQL editor: https://pnihqpsppbfuzvrlmzgc.supabase.co/project/_/sql

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('note', 'song', 'image')),
  content TEXT NOT NULL,
  caption TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  reactions JSONB DEFAULT '{"heart": 0, "star": 0, "sparkle": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX posts_timestamp_idx ON posts (timestamp DESC);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access"
  ON posts FOR SELECT
  USING (true);

-- Create policy to allow public insert
CREATE POLICY "Allow public insert"
  ON posts FOR INSERT
  WITH CHECK (true);

-- Create policy to allow public update
CREATE POLICY "Allow public update"
  ON posts FOR UPDATE
  USING (true);

-- Create policy to allow public delete
CREATE POLICY "Allow public delete"
  ON posts FOR DELETE
  USING (true);
