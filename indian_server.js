const express = require("express");
const bodyParser = require("body-parser");
const { initializeApp } = require("firebase/app");
const {
  getDatabase,
  ref,
  get,
  set,
  update,
} = require("firebase/database");
const { format } = require("date-fns"); // For date formatting

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const server = express();
server.use(bodyParser.json());

// Helper function to get a random element from an array
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to ensure the value is an integer
function toInteger(value) {
  return isNaN(value) ? 0 : Math.floor(value);
}

// Function to accumulate value in game2Collection
async function accumulateGame2Collection(amount) {
  const game2CollectionRef = ref(database, "game2Collection");
  const game2CollectionRef1 = ref(database, "game2Collection/game2Collection");

  const game2CollectionSnapshot = await get(game2CollectionRef1);
  let currentCollectionValue = 0;

  currentCollectionValue = toInteger(game2CollectionSnapshot.val());
  console.log(currentCollectionValue);

  const newCollectionValue = currentCollectionValue + toInteger(amount);

  await update(game2CollectionRef, { game2Collection: newCollectionValue });
}

// Function to update user wallet, append transaction, and update Last5Matches
async function updateUserWalletAndTransaction(phoneNumber, wonAmount, status) {
  const game2UserRef = ref(database, `game2/${phoneNumber}`);
  const game2UserSnapshot = await get(game2UserRef);
  const game2UserData = game2UserSnapshot.val();

  if (game2UserData) {
    // Retrieve existing Last5Matches list
    const last5MatchesRef = ref(database, `game2/${phoneNumber}/Last5Matches`);
    const last5MatchesSnapshot = await get(last5MatchesRef);
    let last5Matches = last5MatchesSnapshot.exists() ? last5MatchesSnapshot.val() : [];

    // Create a new match entry
    const matchEntry = {
      status: status,
      wonAmount: status === "win" ? wonAmount : 0,
      date: format(new Date(), "dd-MM-yyyy"),
      time: format(new Date(), "HH:mm:ss"),
    };

    // Add the match entry to the beginning of the Last5Matches list
    last5Matches.unshift(matchEntry);

    // Keep only the last 5 matches
    if (last5Matches.length > 5) {
      last5Matches = last5Matches.slice(0, 5);
    }

    // Update Last5Matches in the database
    await update(game2UserRef, {
      Last5Matches: last5Matches,
    });

    // Update wallet balance
    const newWalletBalance = (game2UserData.walletBalance || 0) + wonAmount;
    await update(game2UserRef, { walletBalance: newWalletBalance });

    // Retrieve existing allTrans and wonCashAmount lists
    const allTransRef = ref(database, `username/${phoneNumber}/allTrans`);
    const wonCashAmountRef = ref(
      database,
      `username/${phoneNumber}/wonCashAmount`
    );
    const allTransSnapshot = await get(allTransRef);
    const wonCashAmountSnapshot = await get(wonCashAmountRef);

    let allTrans = allTransSnapshot.exists() ? allTransSnapshot.val() : [];
    let wonCashAmount = wonCashAmountSnapshot.exists()
      ? wonCashAmountSnapshot.val()
      : [];

    // Create new transaction
    const transaction = {
      amount: wonAmount,
      date: format(new Date(), "dd-MM-yyyy"),
      time: format(new Date(), "HH:mm:ss"),
      title: `Patti King - you won Rs ${wonAmount}`,
      type: "game2",
    };

    const transaction1 = {
      amount: wonAmount,
      date: format(new Date(), "dd-MM-yyyy"),
      timeSlot: format(new Date(), "HH:mm:ss"),
      title: `Patti King - you won Rs ${wonAmount}`,
      type: "game2",
    };

    // Add transaction to lists
    allTrans.push(transaction);
    wonCashAmount.push(transaction1);

    // Update allTrans and wonCashAmount in the database
    await update(ref(database, `username/${phoneNumber}`), {
      allTrans: allTrans,
      wonCashAmount: wonCashAmount,
    });
  }
}

server.post("/bet", async (req, res) => {
  const { phoneNumber, cardIds, betAmount } = req.body;

  if (!phoneNumber || !cardIds || !betAmount) {
    return res.status(400).send("Missing required fields");
  }

  const userRef = ref(database, `game2/${phoneNumber}`);

  // Get the current user data
  const userSnapshot = await get(userRef);
  const userData = userSnapshot.val();

  if (!userData) {
    // New player wins
    if (betAmount <= 50) {
      const wonCard = getRandomElement(cardIds);
      const wonAmount = betAmount + betAmount * 0.4;
      await set(userRef, { lossAmount: 0, isFirst: true });
      await accumulateGame2Collection(0);

      // Update wallet, add transaction, and update Last5Matches
      await updateUserWalletAndTransaction(
        phoneNumber,
        parseInt(wonAmount, 10),
        "win"
      );

      res.send({ status: "win", wonCard, wonAmount: parseInt(wonAmount, 10) });
    } else {
      // New player loses
      await accumulateGame2Collection(betAmount * 0.2);
      await set(userRef, { lossAmount: betAmount - betAmount * 0.2, isFirst: true });

      const remainingCards = [
        "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12"
      ].filter(card => !cardIds.includes(card));
      const wonCard = getRandomElement(remainingCards);

      // Update Last5Matches
      await updateUserWalletAndTransaction(
        phoneNumber,
        0,
        "lose"
      );

      res.send({ status: "lose", wonCard });
    }
  } else {
    // Existing player
    const { lossAmount, isFirst } = userData;

    if (!isFirst) {
      // If isFirst is false, check bet amount
      if (betAmount <= 50) {
        // Player wins
        const wonCard = getRandomElement(cardIds);
        const wonAmount = betAmount + betAmount * 0.4;
        await update(userRef, { isFirst: true });

        // Update wallet, add transaction, and update Last5Matches
        await updateUserWalletAndTransaction(
          phoneNumber,
          parseInt(wonAmount, 10),
          "win"
        );

        res.send({
          status: "win",
          wonCard,
          wonAmount: parseInt(wonAmount, 10),
        });
      } else {
        // Player loses
        const remainingCards = [
          "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12"
        ].filter(card => !cardIds.includes(card));
        const wonCard = getRandomElement(remainingCards);
        await accumulateGame2Collection(betAmount * 0.2);

        await update(userRef, {
          lossAmount: lossAmount + betAmount - betAmount * 0.2,
          isFirst: true,
        });

        // Update Last5Matches
        await updateUserWalletAndTransaction(
          phoneNumber,
          0,
          "lose"
        );

        res.send({ status: "lose", wonCard });
      }
    } else {
      // isFirst is true
      if (betAmount + betAmount * 0.4 <= lossAmount) {
        // Player wins
        const wonCard = getRandomElement(cardIds);
        const wonAmount = betAmount + betAmount * 0.4;
        await update(userRef, {
          lossAmount: lossAmount - wonAmount,
        });

        // Update wallet, add transaction, and update Last5Matches
        await updateUserWalletAndTransaction(
          phoneNumber,
          parseInt(wonAmount, 10),
          "win"
        );

        res.send({
          status: "win",
          wonCard,
          wonAmount: parseInt(wonAmount, 10),
        });
      } else {
        // Player loses
        const remainingCards = [
          "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12"
        ].filter(card => !cardIds.includes(card));
        const wonCard = getRandomElement(remainingCards);

        await update(userRef, {
          lossAmount: 0,
          isFirst: true,
        });

        await accumulateGame2Collection(betAmount);

        // Update Last5Matches
        await updateUserWalletAndTransaction(
          phoneNumber,
          0,
          "lose"
        );

        res.send({ status: "lose", wonCard });
      }
    }
  }
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
