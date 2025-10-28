// app.js
App({
  onLaunch: function () {
    wx.cloud.init({
      env: "cloud1-5gubwxe85b798ff4",
      traceUser: true,
    });
  }
});
