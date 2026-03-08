-- Grant DELETE permissions to anon and authenticated roles
GRANT DELETE ON public.academy_courses TO anon;
GRANT DELETE ON public.academy_courses TO authenticated;
GRANT DELETE ON public.academy_lessons TO anon;
GRANT DELETE ON public.academy_lessons TO authenticated;

-- Ensure RLS is enabled and policies allow deletion
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if any and create permissive ones for deletion
DROP POLICY IF EXISTS "Allow anon delete courses" ON public.academy_courses;
CREATE POLICY "Allow anon delete courses" ON public.academy_courses
    FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Allow auth delete courses" ON public.academy_courses;
CREATE POLICY "Allow auth delete courses" ON public.academy_courses
    FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon delete lessons" ON public.academy_lessons;
CREATE POLICY "Allow anon delete lessons" ON public.academy_lessons
    FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Allow auth delete lessons" ON public.academy_lessons;
CREATE POLICY "Allow auth delete lessons" ON public.academy_lessons
    FOR DELETE TO authenticated USING (true);

-- Reload schema to apply changes
NOTIFY pgrst, 'reload schema';
