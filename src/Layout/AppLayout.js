import Home from '../pages/Home/Home';

// Token bootstrapping (both the real user session and the anonymous guest
// token) is handled globally by ValidateOnLoad + api/client.js, which run on
// every route. This component used to duplicate that with its own
// unguarded anonymous-login fetch that had no idea whether a real user was
// logged in — it would silently overwrite a logged-in user's JWT with the
// anonymous token. Removed rather than fixed in place, since the logic
// already exists correctly elsewhere.
export default function AppLayout() {
  return (
    <>
      {/* Common layout: header, nav, footer (optional) */}
      <Home /> {/* Child routes render here */}
    </>
  );
}
