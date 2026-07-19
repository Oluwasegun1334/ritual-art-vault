/* ═══════════════════════════════════════════
   ART VAULT — FIREBASE INIT
   Initialises the Firebase app and exposes
   `db` as a global Realtime Database reference.
   Must be loaded AFTER the Firebase compat
   SDK scripts and BEFORE app.js.
═══════════════════════════════════════════ */

const firebaseConfig = {
  apiKey:            "AIzaSyAFszxCWvum2Vq9YgXOvUJH3ztdA1bX0dk",
  authDomain:        "ritual-art-vault-9dda9.firebaseapp.com",
  projectId:         "ritual-art-vault-9dda9",
  storageBucket:     "ritual-art-vault-9dda9.firebasestorage.app",
  messagingSenderId: "670064807800",
  appId:             "1:670064807800:web:112393c3475da3682cc28d",
  measurementId:     "G-7MLJPN7M7N",
  /* Realtime Database URL — free on Spark plan, no billing needed */
  databaseURL:       "https://ritual-art-vault-9dda9-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);

/* Global Realtime Database reference used by app.js */
const db = firebase.database();
