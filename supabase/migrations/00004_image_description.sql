-- Add description column to images for searchable tags/descriptions

ALTER TABLE public.images
  ADD COLUMN description TEXT;

-- Update the search_vector to include description in full-text search
-- Must drop and recreate since it's a generated column
ALTER TABLE public.images
  DROP COLUMN search_vector;

ALTER TABLE public.images
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX idx_images_search_vector ON public.images USING GIN (search_vector);
