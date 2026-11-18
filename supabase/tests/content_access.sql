-- Security test for per-plan content access. Run as a privileged user.
-- Creates fake data, checks what each role sees, and ALWAYS rolls back via RAISE EXCEPTION.
-- Expected: semAssinatura=- | mensal=A,B fileA=true | trimestral=B | anual=D | expirado=- |
--           admin=A,B,C,D,E orphan=true | adminUpdate=1 | anon content=0 previews=1 media=public-media
DO $$
DECLARE pm uuid := gen_random_uuid(); pt uuid := gen_random_uuid(); pa uuid := gen_random_uuid();
 adm uuid := gen_random_uuid(); res text := ''; v text;
 u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid(); u4 uuid := gen_random_uuid(); u0 uuid := gen_random_uuid();
BEGIN
 INSERT INTO plans(id,name,slug,price) VALUES (pm,'M','t-m',1),(pt,'T','t-t',1),(pa,'A','t-a',1);
 INSERT INTO auth.users(id,email,instance_id,aud,role) VALUES (adm,'rls-admin@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
 INSERT INTO user_roles(user_id,role) VALUES (adm,'admin') ON CONFLICT DO NOTHING;
 INSERT INTO media(id,bucket,storage_path) VALUES ('00000000-0000-0000-0000-0000000000a1','protected-content','t/a.jpg'),('00000000-0000-0000-0000-0000000000a2','protected-content','t/orphan.jpg'),('00000000-0000-0000-0000-0000000000a3','public-media','pub/p.jpg');
 INSERT INTO content(id,title,published,media_id,media_url) VALUES
  ('00000000-0000-0000-0000-00000000000a','A',true,'00000000-0000-0000-0000-0000000000a1',null),
  ('00000000-0000-0000-0000-00000000000b','B',true,null,null),
  ('00000000-0000-0000-0000-00000000000c','C',false,null,null),
  ('00000000-0000-0000-0000-00000000000d','D',true,null,'https://legacy.example/x.jpg'),
  ('00000000-0000-0000-0000-00000000000e','E',true,null,null);
 INSERT INTO content_plans(content_id,plan_id) VALUES ('00000000-0000-0000-0000-00000000000a',pm),('00000000-0000-0000-0000-00000000000b',pm),('00000000-0000-0000-0000-00000000000b',pt),('00000000-0000-0000-0000-00000000000c',pm),('00000000-0000-0000-0000-00000000000d',pa);
 INSERT INTO content_previews(title) VALUES ('prev');
 INSERT INTO subscriptions(user_id,plan_id,expires_at) VALUES (u1,pm,now()+interval '9 days'),(u2,pt,now()+interval '9 days'),(u3,pa,now()+interval '9 days'),(u4,pm,now()-interval '1 day');
 FOR v IN SELECT unnest(ARRAY['semAssinatura:'||u0,'mensal:'||u1,'trimestral:'||u2,'anual:'||u3,'expirado:'||u4,'admin:'||adm]) LOOP
  PERFORM set_config('request.jwt.claims', json_build_object('sub',split_part(v,':',2),'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  res := res || split_part(v,':',1) || '=' || coalesce((SELECT string_agg(title,',' ORDER BY title) FROM content WHERE id::text LIKE '00000000-0000-0000-0000-0000000000%'),'-')
    || ' fileA=' || public.can_read_protected_object(auth.uid(),'t/a.jpg') || ' orphan=' || public.can_read_protected_object(auth.uid(),'t/orphan.jpg')
    || ' mediaRows=' || (SELECT count(*) FROM media WHERE id::text LIKE '00000000-0000-0000-0000-0000000000a%') || ' | ';
  EXECUTE 'RESET ROLE';
 END LOOP;
 PERFORM set_config('request.jwt.claims', json_build_object('sub',adm,'role','authenticated')::text, true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 UPDATE content SET description='x' WHERE id='00000000-0000-0000-0000-00000000000c';
 GET DIAGNOSTICS v = ROW_COUNT; res := res || 'adminUpdate=' || v || ' | ';
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
 EXECUTE 'SET LOCAL ROLE anon';
 res := res || 'anon content=' || (SELECT count(*) FROM content) || ' previews=' || (SELECT count(*) FROM content_previews WHERE title='prev') || ' media=' || (SELECT string_agg(bucket,',') FROM media WHERE id::text LIKE '00000000-0000-0000-0000-0000000000a%');
 EXECUTE 'RESET ROLE';
 RAISE EXCEPTION 'RESULT: %', res;
END $$;
