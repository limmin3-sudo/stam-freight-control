// Old bookmarks and launch links keep their pairing fragment on the same origin.
// The main entry alone starts the log reader, account session and visual workspace.
const destination = new URL('../../index.html', import.meta.url);
destination.hash = location.hash;
location.replace(destination.href);
