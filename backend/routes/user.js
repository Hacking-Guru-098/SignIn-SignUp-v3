const express = require("express");
const zod = require("zod");
const { User } = require("../db");
const JWT_SECRET = require("../config");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const twilio = require("twilio")
const { body, validationResult } = require("express-validator");;
const router = express.Router();

const transporter = nodemailer.createTransport({
	service: "gmail",
	host: "smtp.gmail.com",
	port: 587,
	secure: false, // Use `true` for port 465, `false` for all other ports
	auth: {
		user: "deepama35@gmail.com",
		pass: "yhgz xywd wtxx lrfq",
	},
});

const signUpSchema = zod.object({
	firstName: zod
		.string()
		.min(2, { message: "First name must be at least 2 characters long" }),
	lastName: zod
		.string()
		.min(2, { message: "Last name must be at least 2 characters long" }),
	password: zod
		.string()
		.min(8, { message: "Password must be 8 or more characters long" })
		.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, {
			message:
				"Password must contain at least one uppercase letter, one lowercase letter, and one number",
		}),
	username: zod.string().email("Invalid email").optional(),
	phoneNumber: zod
		.string()
		.min(10, { message: "Enter correct Mobile number" })
		.optional(),
});

router.post("/signup", async (req, res, next) => {
	const body = req.body;
	const { success, error } = signUpSchema.safeParse(body);

	if (!success) {
		return res.status(400).json({
			message: error.errors[0].message,
		});
	}

	let existingUser;

	if (body.username) {
		existingUser = await User.findOne({ username: body.username });
	} else if (body.phoneNumber) {
		existingUser = await User.findOne({ phoneNumber: body.phoneNumber });
	}

	if (existingUser) {
		return res.status(409).json({
			message: "Username, email or phone number already taken",
		});
	}

	const user = await User.create({
		username: body.username,
		password: body.password,
		firstName: body.firstName,
		lastName: body.lastName,
		phoneNumber: body.phoneNumber,
	});

	const userId = user._id;

	const otp = Math.floor(Math.random() * 100000);
	user.otp = otp;
	user.otpExpiresAt = Date.now() + 300000; // 5 minutes

	await user.save();

	const info = await transporter.sendMail({
		from: '"TraderX Co 👻" <deepama35@gmail.com>', // sender address
		to: body.username, // list of receivers
		subject: "OTP Verification ✔", // Subject line
		text: `Your OTP is ${otp}`, // plain text body
		html: `<b>Your OTP is ${otp}</b>`, // html body
	});

	console.log("Message sent: %s", info.messageId);

	res.json({
		message: "User created successfully. Please verify your email",
	});
});

// router.post("/signuphone", async (req, res, next) => {
// 	const body = req.body;
// 	const { success, error } = signUpSchema.safeParse(body);

// 	if (!success) {
// 		return res.status(400).json({
// 			message: error.errors[0].message,
// 		});
// 	}

// 	let existingUser;

// 	if (body.username) {
// 		existingUser = await User.findOne({ username: body.username });
// 	} else if (body.phoneNumber) {
// 		existingUser = await User.findOne({ phoneNumber: body.phoneNumber });
// 	}

// 	if (existingUser) {
// 		return res.status(409).json({
// 			message: "Username, email or phone number already taken",
// 		});
// 	}

// 	const user = await User.create({
// 		username: body.username,
// 		password: body.password,
// 		firstName: body.firstName,
// 		lastName: body.lastName,
// 		phoneNumber: body.phoneNumber,
// 	});

// 	const userId = user._id;

// 	// const otp = Math.floor(Math.random() * 100000);
// 	// user.otp = otp;
// 	// user.otpExpiresAt = Date.now() + 300000; // 5 minutes

// 	await user.save();

// 	res.json({
// 		message: "User created successfully. Please verify your email",
// 	});
// });


const accountSid = "AC91afb717cd0d224b07963f6a481141a9";
const authToken = "bbb76cd9027135ad47f937e4697c2b0d";
const client = twilio(accountSid, authToken);

router.post(
	"/signuphone",
	[
		body("phoneNumber", "Phone number is required").notEmpty(),
		body("phoneNumber", "Invalid phone number").isMobilePhone(),
	],
	async (req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { phoneNumber } = req.body;
		const user = await User.findOne({ phoneNumber });

		if (user) {
			return res.status(409).json({ message: "Phone number already taken" });
		}

		try {
			const phoneNumber = req.body.phoneNumber;
			const countryCode = "+91"; // replace with the user's country code
			const formattedPhoneNumber =countryCode + phoneNumber.replace(/[^\d]/g, "");
			const verification = await client.verify.v2
				.services("VAf322068ceca08d5d11e78ca15117525a")
				.verifications.create({ to: formattedPhoneNumber, channel: "sms" });

			const otp = verification.sid;
			const user = new User({ formattedPhoneNumber, otp:parseInt(otp) });
			await user.save();

			res.json({
				message:
					"OTP sent to your phone number. Please enter the code to verify.",
			});
		} catch (error) {
			console.error(error);
			res
				.status(500)
				.json({
					message:
						"Error sending OTP. Please check the phone number and try again. If the problem persists, contact support.",
				});
		}
	}
);

router.post(
	"/verifyotphone",
	[
		body("phoneNumber", "Phone number is required").notEmpty(),
		body("otp", "OTP is required").notEmpty(),
	],
	async (req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { phoneNumber, otp } = req.body;
		const user = await User.findOne({ phoneNumber, otp });

		if (!user) {
			return res.status(404).json({ message: "Invalid OTP" });
		}

		try {
			const verificationCheck = await client.verify.v2
				.services("VAf322068ceca08d5d11e78ca15117525a")
				.verificationChecks.create({ to: phoneNumber, code: otp });

			if (verificationCheck.status === "approved") {
				user.isVerified = true;
				await user.save();
				res.json({ message: "Phone number verified successfully" });
			} else {
				res.status(401).json({ message: "Invalid OTP" });
			}
		} catch (error) {
			console.error(error);
			res
				.status(500)
				.json({ message: "Error verifying OTP. Please try again." });
		}
	}
);

router.post("/verify/otp", async (req, res) => {
	try {
		const { username, otp } = req.body;
		if (!username || !otp)
			return res.status(401).send({ message: "Enter Valid Mail and OTP" });
		const user = await User.findOne({ username });
		if (!user) return res.status(404).send({ message: "User not found" });
		if (user.otp !== otp)
			return res.status(401).send({ message: "Invalid OTP" });
		if (user.otpExpiresAt < Date.now())
			return res.status(401).send({ message: "OTP has expired" });
		user.otpVerified = true;
		await user.save();
		res.json({
			message: "OTP verified successfully",
		});
	} catch (error) {
		res.status(500).send({
			error: error.message,
			message: "Server error:",
		});
		console.log(error);
	}
});


const signInSchema = zod.object({
	username: zod.union([zod.string().email(), zod.string()]).optional(),

	password: zod
		.string()
		.min(8, { message: "Password must be 8 or more characters long" }),
});

// router.post("/signin", async (req, res, next) => {
// 	const body = req.body;
// 	const { success } = signInSchema.safeParse(body);

// 	if (!success) {
// 		return res.status(400).json({
// 			message: "Incorrect inputs",
// 		});
// 	}

// 	const user = await User.findOne({
// 		username: req.body.username,
// 		password: req.body.password,
// 	});

// 	if (user) {
// 		if (!user.otpVerified) {
// 			return res.status(401).json({
// 				message: "Please verify your email first",
// 			});
// 		}
// 		const token = jwt.sign(
// 			{
// 				userId: user._id,
// 			},
// 			JWT_SECRET
// 		);

// 		res.json({
// 			token: token,
// 		});
// 		return;
// 	}

// 	res.status(401).json({
// 		message: "Error while logging in",
// 	});
// });

router.post("/signin", async (req, res, next) => {
	const body = req.body;
	const { success } = signInSchema.safeParse(body);

	if (!success) {
		return res.status(400).json({
			message: "Incorrect inputs",
		});
	}

	const user = await User.findOne({
		username: req.body.username,
	});

	if (!user) {
		return res.status(401).json({
			message: "User not found",
		});
	}

	// Add logging to see the stored and entered passwords
	console.log("Stored password:", user.password);
	console.log("Entered password:", req.body.password);

	if (req.body.password !== user.password) {
		return res.status(401).json({
			message: "Incorrect password",
		});
	}

	const token = jwt.sign(
		{
			userId: user._id,
		},
		JWT_SECRET
	);

	res.json({
		token: token,
	});
});


module.exports = router;
