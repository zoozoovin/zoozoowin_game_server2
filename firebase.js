import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA7j5Q8vXwsi7N5hmGuV4xJE6hsqwYtffU",

  authDomain: "zoozoovin-86d2e.firebaseapp.com",

  databaseURL: "https://zoozoovin-86d2e-default-rtdb.firebaseio.com",

  projectId: "zoozoovin-86d2e",

  storageBucket: "zoozoovin-86d2e.appspot.com",

  messagingSenderId: "34493646584",

  appId: "1:34493646584:web:382dcf886182b7540f9d0d",

  measurementId: "G-BET7J4HTZM",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default database;
