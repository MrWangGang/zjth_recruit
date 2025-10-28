// app.js
App({
  onLaunch: function () {
    wx.cloud.init({
      env: "cloud1-5gni4f973eed1b7c",
      traceUser: true,
    });
  }
});
