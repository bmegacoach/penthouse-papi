-- Penthouse Papi Database Schema
-- Version 1.0
-- Dependencies: uuid-ossp

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Concepts Table
CREATE TABLE concepts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project TEXT NOT NULL CHECK (project IN ('goldbackbond', 'coachAI', 'camp_alpha')), -- Add other projects as needed
    phase TEXT CHECK (phase IN ('awareness', 'consideration', 'conversion', 'retention')),
    description TEXT NOT NULL,
    target_audience TEXT[], -- Array of strings
    goals TEXT[],
    deadline DATE,
    assets_provided TEXT[], -- Links to files in Storage
    competitive_intel JSONB, -- Stores scraped data
    status TEXT DEFAULT 'analyzing' CHECK (status IN ('analyzing', 'planning', 'production', 'active', 'completed', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Calendar Table (Production Plan)
CREATE TABLE calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
    post_date DATE NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('video', 'image', 'carousel', 'blog', 'email', 'copy')),
    platform TEXT[] NOT NULL, -- e.g. ['instagram', 'linkedin']
    theme TEXT,
    production_status TEXT DEFAULT 'queued' CHECK (production_status IN ('queued', 'generating', 'review', 'approved', 'posted', 'failed')),
    assigned_to TEXT DEFAULT 'penthouse_papi',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Video Assets Table (Production Artifacts)
CREATE TABLE video_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_item_id UUID REFERENCES calendar(id) ON DELETE SET NULL,
    concept_id UUID REFERENCES concepts(id), -- Denormalized for easier query
    script_notion_id TEXT, -- Link to Notion page
    remotion_code TEXT, -- The generated React code
    render_url TEXT, -- URL in Supabase Storage
    duration_seconds INTEGER,
    status TEXT DEFAULT 'script_review' CHECK (status IN ('script_review', 'rendering', 'ready', 'failed', 'approved')),
    error_log JSONB,
    revision_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by TEXT
);

-- 4. Asset Approvals Table (Audit Trail)
CREATE TABLE asset_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES video_assets(id) ON DELETE CASCADE,
    reviewer TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('approve', 'revise', 'reject')),
    feedback TEXT,
    revision_round INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Asset Performance Table (Analytics)
CREATE TABLE asset_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES video_assets(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    metrics JSONB NOT NULL, -- {views: 0, likes: 0, etc}
    conversions INTEGER DEFAULT 0,
    cost_per_conversion DECIMAL(10, 2),
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_calendar_concept ON calendar(concept_id);
CREATE INDEX idx_calendar_date ON calendar(post_date);
CREATE INDEX idx_video_assets_status ON video_assets(status);
CREATE INDEX idx_performance_asset ON asset_performance(asset_id);
