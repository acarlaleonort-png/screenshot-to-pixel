CREATE TABLE IF NOT EXISTS public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL CHECK (bucket IN ('public-media','protected-content')),
  storage_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  mime_type text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video','audio','file')),
  size bigint,
  width integer,
  height integer,
  duration numeric,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, storage_path)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT SELECT ON public.media TO anon;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER media_touch BEFORE UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.content_plans (
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_id, plan_id)
);
CREATE INDEX IF NOT EXISTS content_plans_plan_id_idx ON public.content_plans(plan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_plans TO authenticated;
GRANT ALL ON public.content_plans TO service_role;
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.content ADD COLUMN IF NOT EXISTS media_id uuid REFERENCES public.media(id) ON DELETE SET NULL;
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS thumbnail_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS content_media_id_idx ON public.content(media_id);
CREATE INDEX IF NOT EXISTS content_thumbnail_media_id_idx ON public.content(thumbnail_media_id);
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS avatar_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cover_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL;
ALTER TABLE public.content_previews ADD COLUMN IF NOT EXISTS thumbnail_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.can_access_content(_user_id uuid, _content_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.content c
    JOIN public.content_plans cp ON cp.content_id = c.id
    JOIN public.subscriptions s ON s.plan_id = cp.plan_id
    WHERE c.id = _content_id AND c.published
      AND s.user_id = _user_id AND s.status = 'active' AND s.expires_at > now()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_read_protected_object(_user_id uuid, _path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.media m
    JOIN public.content c ON c.media_id = m.id OR c.thumbnail_media_id = m.id
    WHERE m.bucket = 'protected-content' AND m.storage_path = _path
      AND public.can_access_content(_user_id, c.id)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_content(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_read_protected_object(uuid, text) FROM anon;

DROP POLICY IF EXISTS "content members read" ON public.content;
CREATE POLICY "content members read" ON public.content FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (published AND public.can_access_content(auth.uid(), id)));

CREATE POLICY "content_plans admin" ON public.content_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "content_plans member read" ON public.content_plans FOR SELECT TO authenticated
  USING (public.can_access_content(auth.uid(), content_id));

CREATE POLICY "media admin" ON public.media FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "media public read" ON public.media FOR SELECT TO anon, authenticated
  USING (bucket = 'public-media');
CREATE POLICY "media protected read" ON public.media FOR SELECT TO authenticated
  USING (bucket = 'protected-content' AND public.can_read_protected_object(auth.uid(), storage_path));

CREATE POLICY "public-media read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'public-media');
CREATE POLICY "protected-content read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'protected-content' AND public.can_read_protected_object(auth.uid(), name));
CREATE POLICY "media admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('public-media','protected-content') AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "media admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('public-media','protected-content') AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "media admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('public-media','protected-content') AND public.has_role(auth.uid(), 'admin'));

COMMENT ON COLUMN public.content.media_url IS 'LEGACY: used only when media_id is null';
COMMENT ON COLUMN public.content.thumbnail_url IS 'LEGACY: used only when thumbnail_media_id is null';
COMMENT ON COLUMN public.site_settings.avatar_url IS 'LEGACY: used only when avatar_media_id is null';
COMMENT ON COLUMN public.site_settings.cover_url IS 'LEGACY: used only when cover_media_id is null';