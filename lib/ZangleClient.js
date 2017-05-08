const zangleConfig = require('../config/zangle');

const request = require('request');
const cheerio = require('cheerio');

const EventEmitter = require('events');

class Class {
    constructor (opts = {}) {
        Object.assign(Object.assign(this, {
            assignments: [],
            grade: 'Unknown',
            percent: null
        }), opts);
    }
}

class Student {
    constructor (opts = {}) {
        Object.assign(this, opts);

        this.classes = [];
    }
}

class ZangleClient extends EventEmitter{
    constructor (user, pass) {
        super();

        this.auth (user, pass).then( (res) => {
            if (!res.authSuccess) {
                this.emit('authFail', user);
                return;
            }

            this.sessionCookie = res.cookie.split(';')[0];

            console.log(this.sessionCookie);

            this.emit('authSuccess');

            this._init().catch( (e) => {
                console.error(`Unable to init: ${e}`);
            });
        } );
    }

    async _init () {
        this.students = await this.getStudentList();

        if(this.students.length === 1) {
            await this.setActiveStudent (this.students[0]);
        }

        console.log(this.students);
    }

    async setActiveStudent (student) {
        console.log(`Setting active student to ${student.name} (${student.id})`);

        if (this.students.indexOf(student) === -1) {
            console.warn(`zangleClient: Student ${student.name} is being set as active but does not exist in cached students.`);
        }

        await this.loadData({uri: zangleConfig.routes.SET_STUDENT + student.id});

        this.activeStudent = student;
        this.emit('activeStudent', student);
    }

    getHeaders () {
        return {
            cookie: this.sessionCookie,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.96 Safari/537.36'
        }
    }

    loadData (opts) {
        const headers = this.getHeaders ();

        if (opts.headers) {
            Object.assign(opts.headers, headers);
        } else {
            opts.headers = headers;
        }

        return new Promise ( (resolve, reject) => {
            request ( opts, (err, res, body) => {
                if (err) return reject (err);

                if (!res.statusCode.toString().startsWith('2')) {
                    return reject(`Status Code ${res.statusCode}`);
                }

                resolve (body);
            } )
        } );
    }

    auth (user, pass) {
        return new Promise((resolve, reject) => {
            request.post({
                method: 'POST',
                url: zangleConfig.BASE_URL + zangleConfig.routes.SIGNIN,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.96 Safari/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                json: true,
                form: {
                    Pin: user,
                    Password: pass,
                    districtid: ''
                }
            }, (err, res, body)=> {
                if (err) return reject(err);

                if (!res.statusCode.toString().startsWith('2')) {
                    return reject(`Status Code ${res.statusCode}${body.error?`. Error: ${body.error}` : ''}`);
                }

                //noinspection JSValidateTypes
                if (body.valid != 1) {
                    return resolve({ authSuccess: false });
                }

                if (!res.headers.hasOwnProperty('set-cookie')) {
                    return reject('The response did not include a session ID.');
                }

                resolve({ authSuccess: true, cookie: res.headers['set-cookie'][0] });
            })
        });
    }

    async getStudentList () {
        let body = await this.loadData({uri: zangleConfig.BASE_URL + zangleConfig.routes.STUDENTLIST});

        let $ = cheerio.load(body);

        let studentRows = $('#stuBannerTable .odd.sturow');

        let students = [];

        studentRows.each( function () {
            let id = $(this).attr('id');
            let children = $(this).children();
            children.splice(0, 2);

            let data = [];

            children.each( function () {
                data.push($(this).html());
            } );

            let years = data[3].split('-').map( y => parseInt ( y.trim () ) );

            students.push(new Student({
                id,
                name: data[0],
                grade: data[1],
                school: data[2],
                year: {
                    start: years[0],
                    end: years[1]
                },
                birthday: data[4],
                advisor: data[5],
                counselor: data[6]
            }))
        } );

        return students;
    }

    async loadClasses () {
        let data = await this.loadCategory('Assignments');

        let $ = cheerio.load(data);

        let classTables = $('.txtin3');

        let self = this;

        classTables.each( function () {
            let classRows = $(this).find('> thead > tr');

            let gradeInfo = classRows.slice(1, 2).find('> td').html();

            let grade = zangleConfig.regex.GRADE.exec(gradeInfo);

            let classInfo = classRows.slice(0, 1).find('> td');

            let topInfo = classInfo.html();

            let periodExec = zangleConfig.regex.PERIOD.exec(topInfo);
            let classExec = zangleConfig.regex.CLASS.exec(topInfo);

            let teacherInfo = classInfo.slice(1).html();

            let teacherExec = zangleConfig.regex.TEACHER.exec(teacherInfo);

            self.activeStudent.classes.push(new Class({
                period: periodExec[1],
                name: classExec[2],
                id: classExec[3],
                teacher: (teacherExec[2] + ' ' + teacherExec[1]).trim(),
                grade: grade[1],
                percent: (grade.length > 2) ? grade[3] : null
            }));
        } );

        return this.activeStudent.classes;
    }

    loadCategory (category) {
        return this.loadData({
            url: zangleConfig.BASE_URL + zangleConfig.routes.PROFILE_DATA + category
        });
    }
}

module.exports = ZangleClient;