const express = require('express');
const router = express.Router();
const controller = require("../controller/user.controller.js");

router.post('/register', controller.registerUser);
router.post('/login', controller.loginUser);

module.exports = router;