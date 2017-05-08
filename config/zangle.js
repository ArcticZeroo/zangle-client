module.exports = {
    BASE_URL: 'https://webconnect.bloomfield.org/zangle/StudentPortal/Home/',
    routes: {
        SIGNIN: 'Login',
        STUDENTLIST: 'PortalMainPage',
        PROFILE_DATA: 'LoadProfileData/',
        PRINT: 'PrintStudentReport',
        SET_STUDENT: 'https://webconnect.bloomfield.org/zangle/StudentPortal/StudentBanner/SetStudentBanner/'
    },
    regex: {
        PERIOD: /<label for="period" id="lblperiod">Per<\/label>:[\s\S]*<\/b>([0-9])/,
        CLASS: /<b>(&#xA0;|&nbsp;)+(.+) \(([0-9]+)\)<\/b>/,
        TEACHER: /<label for="teacher"[\s\S]*[\r\n]+(.+),(.+)/,
        GRADE: /Grade<\/label>:[\s\S]*<\/b>[ ]*([A-Z])[ ]*(\(([0-9]{1,2}.[0-9]{1,2})%\))?/
    }
};