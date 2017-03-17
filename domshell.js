const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { console } = Cu.import("resource://gre/modules/Console.jsm", {});

function promiseDocumentLoaded(doc) {
  if (doc.readyState == "complete") {
    return Promise.resolve(doc);
  }

  return new Promise(resolve => {
    doc.defaultView.addEventListener("load", function(event) {
      resolve(doc);
    }, {once: true});
  });
}

function promiseObserved(topic, test = () => true) {
  return new Promise(resolve => {
    let observer = (subject, topic, data) => {
      if (test(subject, data)) {
        Services.obs.removeObserver(observer, topic);
        resolve({subject, data});
      }
    };
    Services.obs.addObserver(observer, topic, false);
  });
}

// Create a file: URL that references the test script specified by the first
// argument.  We currently assume that the script is in the same directory as
// this file.
const testScript = __LOCATION__.parent.clone();
testScript.append(arguments[0]);
const testURI = Services.io.newFileURI(testScript);

const windowlessBrowser = Services.appShell.createWindowlessBrowser(true);

// Get the underlying docshell's nsIWebNavigation interface.
const webNav = windowlessBrowser.QueryInterface(Ci.nsIInterfaceRequestor).
                                 getInterface(Ci.nsIDocShell).
                                 QueryInterface(Ci.nsIWebNavigation);

// Do a bunch of stuff that might not be necessary.
const systemPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
webNav.createAboutBlankContentViewer(systemPrincipal);
webNav.useGlobalHistory = false;
webNav.loadURI("data:text/html,", Ci.nsIWebNavigation.LOAD_FLAGS_NONE, null, null, null);

// Wait for the document to load and then load the test script in it.
promiseObserved("chrome-document-global-created", win => win.document == webNav.document)
.then(() => {
  return promiseDocumentLoaded(windowlessBrowser.document);
})
.then((document) => {
  Services.scriptloader.loadSubScript(testURI.spec, document, 'UTF-8');
  done = true;
})
.catch((error) => {
  console.error(error);
  done = true;
});

// Hackily keep xpcshell alive until we're done.
let done = false;
let mainThread = Cc["@mozilla.org/thread-manager;1"].getService(Ci.nsIThreadManager).currentThread;
while (!done)
  mainThread.processNextEvent(true);
while (mainThread.hasPendingEvents())
  mainThread.processNextEvent(true);
