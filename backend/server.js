const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');
const initializeDatabase = require("./DB/databaseInitialize.js");
const userRoutes = require('./routes/user.route.js');
const cookieParser = require('cookie-parser');
// const diagnoseRoutes = require('./routes/user.diagnose.js');

const corsOptions = {
    origin: ['http://localhost:5173'],
    methods:['GET','POST','PUT','DELETE'],
    credentials:true,            
    optionSuccessStatus:200
};

app.use(cors(corsOptions))
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

app.use("/api/user", userRoutes);

app.get('/', async (req,res)=>{
    res.send('Medical Backend is running');
})


app.listen(PORT, () => {
    initializeDatabase();
    console.log(`Server is running on port ${PORT}`);
});
