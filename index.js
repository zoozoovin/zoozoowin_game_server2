const express = require("express");
const bodyParser = require("body-parser");
const { initializeApp } = require("firebase/app");
const {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
} = require("firebase/database");
const { format } = require("date-fns");
const { utcToZonedTime } = require("date-fns-tz"); // For date formatting

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

// Function to update user wallet and append transaction to allTrans and wonCashAmount
async function updateUserWalletAndTransaction(phoneNumber, wonAmount) {
  const userRef = ref(database, `username/${phoneNumber}`);
  const userSnapshot = await get(userRef);
  const userData = userSnapshot.val();

  if (userData) {
    const newWalletBalance = (userData.walletBalance || 0) + wonAmount;
    await update(userRef, { walletBalance: newWalletBalance });

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

    const now = new Date();
    const gmtDate = utcToZonedTime(now, "Etc/UTC");

    const transaction = {
      amount: wonAmount,
      date: format(gmtDate, "dd-MM-yyyy"),
      time: format(gmtDate, "HH:mm:ss"),
      title: `Patti King - you won Rs ${wonAmount}`,
      type: "game2",
      gmtTime: gmtDate.toUTCString(), // Add GMT time in UTC format
    };

    const transaction1 = {
      amount: wonAmount,
      date: format(gmtDate, "dd-MM-yyyy"),
      timeSlot: format(gmtDate, "HH:mm:ss"),
      title: `Patti King - you won Rs ${wonAmount}`,
      type: "game2",
      gmtTime: gmtDate.toUTCString(), // Add GMT time in UTC format
    };

    allTrans.push(transaction);
    wonCashAmount.push(transaction1);

    await update(userRef, {
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

  const userSnapshot = await get(userRef);
  const userData = userSnapshot.val();

  if (!userData) {
    if (betAmount <= 50) {
      const wonCard = getRandomElement(cardIds);
      const wonAmount = betAmount + betAmount * 0.4;
      await set(userRef, { lossAmount: 0, isFirst: true });
      await accumulateGame2Collection(0);

      await updateUserWalletAndTransaction(
        phoneNumber,
        parseInt(wonAmount, 10)
      );

      res.send({ status: "win", wonCard, wonAmount: parseInt(wonAmount, 10) });
    } else {
      await accumulateGame2Collection(betAmount * 0.2);

      await set(userRef, {
        lossAmount: betAmount - betAmount * 0.2,
        isFirst: true,
      });
      const remainingCards = [
        "c1",
        "c2",
        "c3",
        "c4",
        "c5",
        "c6",
        "c7",
        "c8",
        "c9",
        "c10",
        "c11",
        "c12",
      ].filter((card) => !cardIds.includes(card));
      const wonCard = getRandomElement(remainingCards);
      res.send({ status: "lose", wonCard });
    }
  } else {
    const { lossAmount, isFirst } = userData;

    if (!isFirst) {
      if (betAmount <= 50) {
        const wonCard = getRandomElement(cardIds);
        const wonAmount = betAmount + betAmount * 0.4;
        await update(userRef, { isFirst: true });

        await updateUserWalletAndTransaction(
          phoneNumber,
          parseInt(wonAmount, 10)
        );

        res.send({
          status: "win",
          wonCard,
          wonAmount: parseInt(wonAmount, 10),
        });
      } else {
        const remainingCards = [
          "c1",
          "c2",
          "c3",
          "c4",
          "c5",
          "c6",
          "c7",
          "c8",
          "c9",
          "c10",
          "c11",
          "c12",
        ].filter((card) => !cardIds.includes(card));
        const wonCard = getRandomElement(remainingCards);
        await accumulateGame2Collection(betAmount * 0.2);

        await update(userRef, {
          lossAmount: lossAmount + betAmount - betAmount * 0.2,
          isFirst: true,
        });
        res.send({ status: "lose", wonCard });
      }
    } else {
      if (betAmount + betAmount * 0.4 <= lossAmount) {
        const wonCard = getRandomElement(cardIds);
        const wonAmount = betAmount + betAmount * 0.4;
        await update(userRef, {
          lossAmount: lossAmount - wonAmount,
        });

        await updateUserWalletAndTransaction(
          phoneNumber,
          parseInt(wonAmount, 10)
        );

        res.send({
          status: "win",
          wonCard,
          wonAmount: parseInt(wonAmount, 10),
        });
      } else {
        const remainingCards = [
          "c1",
          "c2",
          "c3",
          "c4",
          "c5",
          "c6",
          "c7",
          "c8",
          "c9",
          "c10",
          "c11",
          "c12",
        ].filter((card) => !cardIds.includes(card));
        const wonCard = getRandomElement(remainingCards);
        await accumulateGame2Collection(betAmount * 0.2);

        await update(userRef, {
          lossAmount: lossAmount + betAmount - betAmount * 0.2,
        });
        res.send({ status: "lose", wonCard });
      }
    }
  }
});

server.get("/", (req, res) => {
  res.send("Firebase Express Server");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
