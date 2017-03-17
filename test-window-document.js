let spew = typeof dump !== 'undefined' ? (m => dump(`${m}\n`)) : console.log;
let win = typeof window === 'undefined' ? 'undefined' : window;
let doc = typeof document === 'undefined' ? 'undefined' : document;

spew(`${win}, ${doc}`);
