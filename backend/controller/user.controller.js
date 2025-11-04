const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const registerUser = async (req,res)=>{
    try{
        const {name,age,username,email,password} = req.body;
        const existUser = await User.findOne({username});
        if(existUser){
            return res.status(400).json({message: "User already exists"});
        }

        const hashPassword = await bcrypt.hash(password,10)
        const newUser = new User({
            name: name,
            age: age,
            username: username,
            email: email,
            password: hashPassword
        });
        await newUser.save();
        res.status(201).json({message:"User registered successfully"});
    }catch(err){
        res.status(500).json({message: `Something went wrong: ${err}`});
    }
}

const loginUser = async (req,res)=>{
    const {username,password} = req.body;
    if(!username || !password){
        return res.status(400).json({message: "Please fill all the field"});
    }
    try{
        const user = await User.findOne({username});
        if(!user){
            return res.status(404).json({message: "User not found"});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(isMatch){
            let token = crypto.randomBytes(20).toString('hex');
            user.token = token;
            await user.save();
            res.cookie('token', token , {
                httpOnly:false,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            res.cookie('name', user.name , {
                httpOnly:false,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            return res.status(200).json({message: "Login successfull", token: token})
        }
    }catch(err){
        return res.status(500).json({message: `Something went wrong: ${err}`});
    }
}

module.exports = { registerUser, loginUser};