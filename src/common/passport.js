const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const passport = require("passport");
const userModel = require("../apps/models/user");
const { sign } = require("../common/jwt");
require("dotenv").config();
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: "http://localhost:3000/admin/auth/google/callback",
    },
    async function (accessToken, refreshToken, profile, cb) {
      const tokenLogin = sign(profile);
      profile.tokenLogin = tokenLogin;
      // Check profile
      if (profile) {
        const userExists = await userModel.findOne({
          email: profile.emails[0].value,
        });
        if (userExists) {
          // Nếu tìm có email rồi
          if (!userExists.google_id) {
            await userModel.updateOne(
              { email: userExists.email },
              {
                $set: { google_id: profile?.id },
              }
            );
          }
          await userModel.updateOne(
            { email: userExists.email },
            { $set: { tokenLogin } }
          );
        } else {
          // Nếu chưa có email thì tạo mới account
          const hashedPassword = "siuu";
          const newUser = {
            email: profile?.emails[0].value,
            password: hashedPassword,
            full_name: profile?.displayName,
            google_id: profile?.id,
            tokenLogin,
          };
          await new userModel(newUser).save();
        }
      }
      return cb(null, profile);
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      callbackURL: "http://localhost:3000/admin/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
    },
    async function (accessToken, refreshToken, profile, cb) {
      const tokenLogin = sign(profile);
      profile.tokenLogin = tokenLogin;
      if (profile) {
        const userExists = await userModel.findOne({
          email: profile.emails[0].value,
        });
        if (userExists) {
          // Nếu tìm có email rồi
          if (!userExists.facebook_id) {
            await userModel.updateOne(
              { email: userExists.email },
              {
                $set: { facebook_id: profile?.id },
              }
            );
          }
          await userModel.updateOne(
            { email: userExists.email },
            { $set: { tokenLogin } }
          );
        } else {
          // Nếu chưa có email thì tạo mới account
          let emailCustom;
          if (!profile?.emails[0].value) {
            emailCustom = `${tokenLogin}@gmail.com`;
          } else {
            emailCustom = profile?.emails[0].value;
          }
          const hashedPassword = "siuu";
          const newUser = {
            email: emailCustom,
            password: hashedPassword,
            full_name: profile?.displayName,
            facebook_id: profile?.id,
            tokenLogin,
          };
          await new userModel(newUser).save();
        }
      }
      return cb(null, profile);
    }
  )
);
