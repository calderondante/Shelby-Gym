-- Make JSON initializers explicit in the two existing importer functions.
-- Keep their reviewed definitions intact; no data is changed.
do $$
declare target regprocedure; definition text;
begin
 foreach target in array array[
  'private.import_customer_rows(uuid,text,text,jsonb,boolean)'::regprocedure,
  'public.import_gym_history(uuid,text,text,jsonb,boolean)'::regprocedure
 ] loop
  definition:=pg_get_functiondef(target);
  if position('jsonb:=''[]''' in definition)=0 then raise exception 'Expected importer JSON initializer missing'; end if;
  execute replace(definition,'jsonb:=''[]''','jsonb:=''[]''::jsonb');
 end loop;
end $$;
