const { app, Tray, Menu, BrowserWindow, session, net, ipcMain, webContents } = require('electron');
const path = require('path');
const appFolder = path.dirname(process.execPath)

async function getDay(session_id = String, user_id = Number, domain = String, day = String){    
  return await net.fetch(`https://${domain}/Services/Calendar.svc/GetCalendarEventsByUser`, {
      method: 'POST',
      headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0',
      'Content-Type': 'application/json',
      'Cookie': `ASP.NET_SessionId= ${session_id};`, // need this aswell as user_id to acess api
      },
      body: JSON.stringify({
        userId: user_id, 
        startDate: day,
        endDate: day,
        start: 0,
      }),
  }).then((res) => 
    res.json()
  ).then((data) => { 
    return data.d
  }).catch((err) => {
    console.log("There was an error in the class fetch: " + err)
  })
}

// user data for the session
let user = {
  logged_in: false,
  session_id: String,
  id: Number,
  school_domain: String
}

async function createWindow() {
  const windowWidth = 350;
  const windowHeight = 460;

  // Get the bounds of the tray icon and calc the position of tray icon
  const trayBounds = tray.getBounds();
  const windowX = Math.round(trayBounds.x - trayBounds.width / 2 - windowWidth / 2);
  const windowY = Math.round(trayBounds.y - windowHeight); 

  // Create the BrowserWindow
  window = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowX,
    y: windowY,
    frame: false, // Set to true if you want a frame around the window
    show: false, // Set to false to show the window later
    resizable: false, // Set to true if you want to allow resizing the window
    alwaysOnTop: true, // Set to true to keep the window always on top
    skipTaskbar: true, // hides the app from showing in the taskbar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
  });

  // Load the compass url
  window.loadURL("https://schools.compass.education/");

  // Show the window when it is ready to be displayed
  window.once('ready-to-show', () => {
    window.show();
  });

  // Hide the window when it loses focus
  window.on('blur', () => window.hide() );

  window.webContents.on('did-navigate', async (event, url) => {
    // Inject CSS to hide the scrollbar from the window
    window.webContents.insertCSS(`body { overflow: hidden; }`);

    // if the url matches https://SCHOOL-LOCATION.compass.education with no trailing backslashes.
    if (url.match(/^(?:https?:\/\/)?([a-z0-9]+-[a-z0-9]+)\.compass\.education\/$/i)) {

      // get domain and user_id thought the Compass object on the loaded website. The session Id is from the cookies.
      user.domain = await window.webContents.executeJavaScript(`Compass.schoolPrimaryFqdn`)
      user.id = await window.webContents.executeJavaScript(`Compass.organisationUserId`)
      user.session_id = await session.defaultSession.cookies.get({ name: "ASP.NET_SessionId" }).then((val) =>  val[0].value)
      
      window.loadFile(path.join(__dirname, 'index.html')); // load the main html file
      user.logged_in = true
    }
  });
}

// TODO: seperate auth and info windows

app.whenReady().then(() => {

  // create the tray icon and the logic for it
  const iconPath = path.join(__dirname, 'icon.ico');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Compass Cal', enabled: false }, 
    { label: 'Settings' }, // TODO: add settings window
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setToolTip('Compass Cal');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (!window.isVisible()) {
      window.show();
    }
  });

  // handle the fetchdata ipc call from the renderer
  ipcMain.handle('fetchdata', async (event, ...args) => {
    return await getDay(user.session_id, user.id, user.domain, ...args)
  })

  createWindow();
});

// once the app is opened, it will open every time the user logs in
app.setLoginItemSettings({
  openAtLogin: true,
  path: appFolder,
})

// Quit the app when all windows are closed
app.on('window-all-closed', () => {
  app.quit();
});