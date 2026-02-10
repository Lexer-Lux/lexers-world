INSERT INTO public.allowlist (twitter_username)
VALUES
  ('captgouda24'),
  ('9chabard'),
  ('10chabard'),
  ('_candroid'),
  ('goblinodds'),
  ('jayluxeed'),
  ('tetraspacewest'),
  ('gptbrooke'),
  ('tenobrus'),
  ('aella_girl'),
  ('bungoman'),
  ('oneeyedalpaca')
ON CONFLICT (twitter_username) DO NOTHING;
