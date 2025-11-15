const customerModel = require("../models/customer");

const checkCustomer = async (req, res, next) => {
  try {
    if (req.session.email) {
      const customer = await customerModel.findOne({
        email: req.session.email,
      });
      res.locals.customer = customer || null;
    } else {
      res.locals.customer = null;
    }
  } catch (err) {
    console.error("checkCustomer middleware error:", err);
    res.locals.customer = null;
  } finally {
    next();
  }
};

const checkCustomerAuth = (req, res, next) => {
  if (!req.session.email) {
    return res.redirect("/login");
  }
  next();
};

module.exports = {
  checkCustomer,
  checkCustomerAuth,
};
