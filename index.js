import express from 'express';

const app = express();

app.use(express.static('client'));

app.listen(8080, () => {
    console.log("Listening on port 8080");
});