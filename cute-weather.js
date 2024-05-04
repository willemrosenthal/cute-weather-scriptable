// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: cloud;
// CUTE WEATHER - WILLEM
// v2.2483

// SETTINGS
const user = 0;
const enableDayNightBgChange = true

const userSettings = [
    {
        userName: 'Willem',
        bgDayGradiantTop: 'ff99ff',
        bgDayGradiantBottom: 'ff99ff',
        bgNightGradiantTop: 'a26afc',
        bgNightGradiantBottom: 'a26afc',
        birthday: [8,9],
    },
    {
        userName: 'Meg',
        bgDayGradiantTop: 'faacc6',
        bgDayGradiantBottom: 'e085f2',
        bgNightGradiantTop: 'b27aeb',
        bgNightGradiantBottom: '8e6dd6',
        birthday: [6,16],
    },
];

//////// APP START //////

// set settings
console.log('user ' +  userSettings[user].userName);
const dayColorTop = userSettings[user].bgDayGradiantTop;
const dayColorBottom = userSettings[user].bgDayGradiantBottom;
const nightColorTop = userSettings[user].bgNightGradiantTop;
const nightColorBottom = userSettings[user].bgNightGradiantBottom;

// bithday
const birthdayMonth = userSettings[user].birthday[0];
const birthdayDay = userSettings[user].birthday[1];
const birthdayIcon = "birthday"; 

// path to assets
const assetDirName = 'cute-weather-assets';

// DEBUG
const debugMode = false
const hideBg = false
const dateDebug = false;

// holidays
const holidayDates = [[1,1],[2,14],[3,17],[3,20],[4,1],[4,9],[5,14],[5,18],[6,21],[9,22],[10,31],[11,24],[12,21],[12,25],[12,31]];
const holidayIcons = ["newyearsday", "valentine", "patrick", "spring", "fool", "easter", "mother", "dad", "summer", "autumn", "halloween", "thanksgiving", "winter", "christmas", "newyears"]

// depricated
//const holidayDays =   [1, 14, 20, 9, 14, 18, 21, 22, 31, 24, 21, 25, 31]
//const holidayMonths = [1, 2,  3,  4, 5,  6,  6,  9,  10, 11, 12, 12, 12]

let widget = await createWidget();
Script.setWidget(widget);
widget.presentMedium();
Script.complete();

async function createWidget() {
    const widget = new ListWidget();

// cache for offline
let fm = FileManager.iCloud();
let cachePath = fm.joinPath(fm.documentsDirectory(), "weatherCache");
if(!fm.fileExists(cachePath)){
  fm.createDirectory(cachePath)
}

// Widget Params for debug. These are the defaults
const widgetParams = JSON.parse((args.widgetParameter != null) ? args.widgetParameter : '{ "LAT" : "42.1947" , "LON" : "-73.3562" , "LOC_NAME" : "Great Boulderton, MA" }')

// WEATHER API PARAMETERS https://home.openweathermap.org/api_keys
const API_KEY = "e61be2cfb8b15f9a16c18322e2664937"

// Latitude and Longitude of the location where you get the weather of.
let latLong = {}
try {
    latLong = await Location.current()
    fm.writeString(fm.joinPath(cachePath, "lastread_latlong"), JSON.stringify(latLong));
} catch {
    console.log("cant get LAT & LON: getting cached, last used lat-long")
    try{
        await fm.downloadFileFromiCloud(fm.joinPath(cachePath, "lastread_latlong"));
        latLong = fm.readString(fm.joinPath(cachePath, "lastread_latlong"));
    }
    catch {
        console.log("no lat-long cashed");
    }
}

if (!latLong.latitude) console.log("fialed to get latlong from gps")

// round to 3 decimal places
const roundToDecimal = (value, place = 100) => Math.round(value * place) * (1/place)
const LAT = roundToDecimal(latLong.latitude) || roundToDecimal(Number(widgetParams.LAT, 1000))
const LON = roundToDecimal(latLong.longitude) || roundToDecimal(Number(widgetParams.LON, 1000))

console.log("LAT:" + LAT + "   LON:" + LON)

// get location name
let geocode;

try {
    geocode = await Location.reverseGeocode(LAT,LON)
    fm.writeString(fm.joinPath(cachePath, "lastread_geo"+"_"+LAT+"_"+LON), JSON.stringify(geocode));
}
catch {
    try{
        console.log("getting geo data from cahced geo data")
        await fm.downloadFileFromiCloud(fm.joinPath(cachePath, "lastread_geo"+"_"+LAT+"_"+LON));
        geocode = fm.readString(fm.joinPath(cachePath, "lastread_geo"+"_"+LAT+"_"+LON));
    }
    catch {
        console.log("no geo cashed");
    }
}
const LOCATION_NAME = geocode[0].locality || widgetParams.LOC_NAME
const STATE = geocode[0].administrativeArea;
// for (const [key, value] of Object.entries(geocode[0])) {
//     console.log(`${key}: ${value}`);
//    } 
const UNITS = "imperial"
const PART = "minutely";


let weatherData;
let usingCachedData = false;


let url =   `https://api.openweathermap.org/data/3.0/onecall?lat=${LAT}&lon=${LON}&units=${UNITS}&exclude=${PART}&appid=${API_KEY}`; // uses pay when over 1000 onecall feature
//let url = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=${units}&lang=en&appid=${API_KEY}`;  // 5 day weather
//let url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=${units}&lang=en&appid=${API_KEY}`;  // today's weather only
//let url = "https://api.openweathermap.org/data/2.5/onecall?lat=" + LAT + "&lon=" + LON + "&exclude=minutely,alerts&units=" + units + "&lang=en&appid=" + API_KEY;
//console.log(url);

// where we will store our weather data
const getTemp = (dayNo) => {
    return Math.round(weatherData.daily[dayNo].temp.day);
}
const getHigh = (dayNo) => {
    return Math.round(weatherData.daily[dayNo].temp.max);
}
const getLow = (dayNo) => {
    return Math.round(weatherData.daily[dayNo].temp.min);
}
const getWeather = (dayNo) => {
    return weatherData.daily[dayNo].weather[0].main;
}
const getWeatherIcon = (dayNo, hourly = false) => {
    if (hourly) return weatherData.hourly[0].weather[0].icon; 
    return weatherData.daily[dayNo].weather[0].icon; 
}
const getWeatherDescription = (dayNo) => {
    return weatherData.daily[dayNo].weather[0].description;
}
const convertTimeFromUnix = (unixTimestamp) => {

    var date = new Date(unixTimestamp * 1000);
    let theDate = date.toLocaleDateString("en-US");
    console.log(theDate);
    return theDate;


    let dateObj = new Date(unixTimestamp * 1000);
    let utcString = dateObj.toUTCString();
    return utcString.slice(-11, -4);
}

// converting time
const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// should i be subtracting the time zone???
const getDay = (altTime) => {
    const _date = (altTime === undefined) ? date : new Date((altTime) * 1000);
    return days[_date.getDay()];
}
const getDate = (altTime) => {
    const _date = (altTime === undefined) ? date : new Date((altTime) * 1000);
    return _date.getDate();
}
const getMonth = (altTime) => {
    const _date = (altTime === undefined) ? date : new Date((altTime) * 1000);
    return months[_date.getMonth()];
}
const getHour = (altTime) => {
    const _date = (altTime === undefined) ? date : new Date((altTime) * 1000);
    return _date.getHours();
}
const getMin = (altTime) => {
    const _date = (altTime === undefined) ? date : new Date((altTime) * 1000);
    return _date.getMinutes();
}

const birthdayCheck = () => {
    //const date = new Date((todayUnixTimeZoned) * 1000);
    //console.log("hour "+ date.getHours()+" tz: "+weatherData.timezone_offset);
    console.log("current: " + date.getMonth() +" bMonth:" + (birthdayMonth-1) + " currentDay:" + date.getDate() +" bDay:"+ birthdayDay);
    return (date.getMonth() == (birthdayMonth-1) && date.getDate() == birthdayDay);
}

const holidayCheck = () => {
    const _day = date.getDate()
    const _month = date.getMonth() + 1; // add 1 because january starts at 0
    // check holidays
    for (let i = 0; i < holidayDates.length; i++) {
        if ((holidayDates[i][0]) == _month && holidayDates[i][1] == _day ) return holidayIcons[i];
        //if (holidayDays[i] == _day && (holidayMonths[i]-1) == _month) return holidayIcons[i];
    }
    return "none";
}

// cache for offline
try {
  weatherData = await new Request(url).loadJSON();
  fm.writeString(fm.joinPath(cachePath, "lastread"+"_"+LAT+"_"+LON), JSON.stringify(weatherData));
      //console.log("sucess")
      //let message = widget.addText(`sucess: ${weatherData}`);
      //// show values
    //   for (const [key, value] of Object.entries(weatherData)) {
    //    console.log(`${key}: ${value}`);
    //   }
    //   console.log("...");
    //   console.log(weatherData.daily[0]);
}catch(e){
  console.log("Offline mode")
  try{
    await fm.downloadFileFromiCloud(fm.joinPath(cachePath, "lastread"+"_"+LAT+"_"+LON));
    let raw = fm.readString(fm.joinPath(cachePath, "lastread"+"_"+LAT+"_"+LON));
    weatherData = JSON.parse(raw);
    usingCachedData = true;
  }catch(e2){
    console.log("Error: No offline data cached")
  }
}

    // CURRENT TIME, offset by timezone
    let todayUnixTimeZoned = weatherData.daily[0].dt + weatherData.timezone_offset;
    const date = new Date((todayUnixTimeZoned) * 1000);
    


    // FUNCTIONS
    function getWeatherImage( day = 0, hourly = false ) {
        let weatherString;
        let iconid = getWeatherIcon(day, hourly)
        
        // get holiday icon (only if hourly is on)
        let holidayIcon = (hourly && day === 0) ? holidayCheck() : "none";

        // get appropriate image
        if (birthdayCheck() && day === 0 && hourly) {
            weatherString = birthdayIcon;
        }
        else if (holidayIcon !== "none" && day === 0 && hourly ) weatherString = holidayIcon;
        else if (iconid == "01d") weatherString = "clear";
        else if (iconid == "01n") {
            weatherString = "clear-night";
            console.log("MOON PHASE: " + weatherData.daily[0].moon_phase);
            if (day === 0 && hourly && weatherData.daily[0].moon_phase > 0.95) {
                weatherString = "full-moon";
            }
            else if (day === 0 && hourly && weatherData.daily[0].moon_phase < 0.05) {
                weatherString = "new-moon";
            }
        }
        else if (iconid == "02d" ) weatherString = "part-cloud";
        else if (iconid == "03d" || iconid == "04d") weatherString = "cloudy";
        else if (iconid == "02n" || iconid == "03n" || iconid == "04n" ) weatherString = "cloudy-night";
        else if (iconid == "09d" ) weatherString = "heavy-rain";
        else if (iconid == "09n" ) weatherString = "heavy-rain";
        else if (iconid == "10d" ) weatherString = "rainy";
        else if (iconid == "10n" ) weatherString = "rainy-night";
        else if (iconid == "11d" ) weatherString = "storm";
        else if (iconid == "11n" ) weatherString = "storm";
        else if (iconid == "13d" ) weatherString = "snow";
        else if (iconid == "13n" ) weatherString = "snow";
        else if (iconid == "50d" ) weatherString = "windy";
        else if (iconid == "50n" ) weatherString = "windy";


        let weatherImagePath = imagesPath + "/" + weatherString + ".png";
        // get the image
        if (fm.fileExists(weatherImagePath)) {
            fm.downloadFileFromiCloud(weatherImagePath);
            let _image = fm.readImage( weatherImagePath)
            return _image;
        }
    }


    // APP VISUALS
    let imagesPath = fm.joinPath(fm.documentsDirectory(), assetDirName);

    // structure
    let main = widget.addStack();
    main.layoutVertically();
    main.topAlignContent();
    //main.setPadding(16,0,16,0);

    // upper section
    let upper = main.addStack();
    if (debugMode) {
        upper.borderWidth = 1;
        upper.borderColor = new Color("#FF0000");
    }
    upper.layoutHorizontally();
    upper.topAlignContent();

    // lower section
    let lower = main.addStack();
    lower.setPadding(5,0,0,0);
    if (debugMode) {
        lower.borderWidth = 1;
        lower.borderColor = new Color("#00FF00");
    }
    lower.layoutHorizontally();
    lower.bottomAlignContent();

    // left box
    let leftBox = upper.addStack();
    if (debugMode) {
        leftBox.borderWidth = 1;
        leftBox.borderColor = new Color("#0000FF");
    }
    leftBox.layoutVertically();


    upper.addSpacer();

    // right box
    let rightBox = upper.addStack();
    if (debugMode) {
        rightBox.borderWidth = 1;
        rightBox.borderColor = new Color("#FF00FF");
    }
    rightBox.layoutHorizontally();
    let emptyRightStack = rightBox.addStack();
    emptyRightStack.addSpacer();
    if (debugMode) {
        emptyRightStack.borderWidth = 1;
        emptyRightStack.borderColor = new Color("#000f00");
        emptyRightStack.backgroundColor = new Color("#000f00");
    }
    //rightBox.addSpacer();

    // LEFT SIDE
    let locText = (STATE)? LOCATION_NAME + ", " + STATE : LOCATION_NAME;
    let locationText = leftBox.addText(locText);
    locationText.font = Font.systemFont(14); //boldSystemFont
    locationText.textColor = Color.white();

    let currentTemp = leftBox.addText(Math.round(weatherData.hourly[0].temp) + "°");
    currentTemp.font = Font.systemFont(54);
    currentTemp.textColor = Color.white();

    // RIGHT SIDE
    let rightBoxContent = rightBox.addStack();
    if (debugMode) {
        rightBoxContent.borderWidth = 1;
        rightBoxContent.borderColor = new Color("#000050");
    }
    rightBoxContent.layoutVertically();
    let dateBox = rightBoxContent.addStack();
    dateBox.addSpacer();
    dateBox.size = new Size(97,0)
    if (debugMode) {
        dateBox.borderWidth = 1;
        dateBox.borderColor = new Color("#F0F000");
    }

    let dateString = getDay() + " " + getMonth() + " " + getDate();
    let dateText = dateBox.addText( dateString );
    dateText.font = Font.systemFont(14);
    dateText.textColor = Color.white();
    dateText.centerAlignText();
    dateBox.addSpacer();

    if (dateDebug) {
        dateText.text = "Wed May 24";
    }

    rightBoxContent.addSpacer(4);
    
    let mainIconBox = rightBoxContent.addStack();  
    mainIconBox.size = new Size(97,0)
    if (debugMode) {
        mainIconBox.borderWidth = 1;
        mainIconBox.borderColor = new Color("#4000F0");
    }
    mainIconBox.layoutHorizontally();
    mainIconBox.centerAlignContent();
    mainIconBox.addSpacer();
    let currentWeatherIcon = mainIconBox.addImage(getWeatherImage(0, true))
    if (debugMode) {
        currentWeatherIcon.borderWidth = 1;
        currentWeatherIcon.borderColor = new Color("#40F0F0");
    }
    currentWeatherIcon.imageSize = new Size(56, 56);
    currentWeatherIcon.centerAlignImage();
    mainIconBox.addSpacer();

    // BOTTOM
    let day0 = upcomingDay(0, 34);
    if (debugMode) {
        day0.borderWidth = 1;
        day0.borderColor = new Color("#F0F000");
    }

    lower.addSpacer();
    let day1 = upcomingDay(1, 34);
    if (debugMode) {
        day1.borderWidth = 1;
        day1.borderColor = new Color("#F0F0F0");
    }

    lower.addSpacer();
    let day2 = upcomingDay(2, 34);
    if (debugMode) {
        day2.borderWidth = 1;
        day2.borderColor = new Color("#00F0F0");
    }

    lower.addSpacer();
    let day3 = upcomingDay(3, 34);
    if (debugMode) {
        day3.borderWidth = 1;
        day3.borderColor = new Color("#F000F0");
    }

    lower.addSpacer();
    let day4 = upcomingDay(4, 34);
    if (debugMode) {
        day4.borderWidth = 1;
        day4.borderColor = new Color("#000FFF");
    }

    // background
    let bgColorA = dayColorTop //'74caf9';
    let bgColorB = dayColorBottom //'74caf9'; //69b9f7

    if (enableDayNightBgChange && (weatherData.hourly[0].dt > weatherData.daily[0].sunset || weatherData.hourly[0].dt < weatherData.daily[0].sunrise)) {
        bgColorA = nightColorTop;
        bgColorB = nightColorBottom;
    }

    let gradient = new LinearGradient()
    gradient.colors = [new Color(bgColorA), new Color(bgColorB)];
    gradient.locations =  [0, 1];
    if (!hideBg) widget.backgroundGradient = gradient


    function upcomingDay(dayNum, imgSize = undefined) {
        //dayNum *= 8;
        let _daystack = lower.addStack();
        _daystack.layoutVertically();

        // day tile
        let _title = _daystack.addStack();
        _title.addSpacer();
        let thisDayUnixTime = weatherData.daily[dayNum].dt + weatherData.timezone_offset;
        let dayTitle = _title.addText( getDay(thisDayUnixTime) ) ;
        dayTitle.font = Font.boldSystemFont(10);
        dayTitle.textColor = Color.white();
        _title.addSpacer();

        // vertical spacer between day and icon
        _daystack.addSpacer(3);

        // weather icon
        let _icon = _daystack.addStack();
        _icon.addSpacer();
        let img = _icon.addImage(getWeatherImage(dayNum))
        if (imgSize !== undefined) img.imageSize = new Size(imgSize, imgSize);
        _icon.addSpacer();


        // vertical spacer between icon and temp
        _daystack.addSpacer(3);

        // high for the day
        let _temp = _daystack.addStack();
        _temp.addSpacer();
        let dayTemp = _temp.addText(getHigh(dayNum) + "°");
        // let dayTemp = _temp.addText(getHigh(dayNum) + "° - " + getLow(dayNum) + "°"); // high and low
        dayTemp.font = Font.boldSystemFont(10);
        dayTemp.textColor = Color.white();
        _temp.addSpacer();

        // parse day
        return _daystack;
    }

    

    return widget;
}
