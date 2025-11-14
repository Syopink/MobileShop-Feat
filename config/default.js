module.exports = {
  app: {
    port: 3000,
    static_folder: `${__dirname}/../src/public/`,
    views_folder: `${__dirname}/../src/apps/views`,
    view_engine: `ejs`,
    session_key: "vietpro",
    session_secure: false,
    tmp: `${__dirname}/../src/tmp/`,
    baseUrlUpload: `${__dirname}/../src/public/uploads/images`,
  },
  mail: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "huybackduong@gmail.com",
    pass: "plrx gsuv vsko dsnn",
  },
};
