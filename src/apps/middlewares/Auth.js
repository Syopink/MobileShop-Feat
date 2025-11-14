const checkAdmin = (req, res, next) => {
  if (!req.session.email || !req.session.password) {
    res.redirect("/admin/login");
  }
  next();
};
const checkLogin = (req, res, next) => {
  if (req.session.email && req.session.password) {
    res.redirect("/admin/dashboard");
  }
  next();
};

module.exports = {
  checkAdmin,
  checkLogin,
};
