const puppeteer = require('puppeteer');
const fs  = require('fs');



function isBase64(str) {
      try {
          return btoa(atob(str)) == str;
      } catch (err) {
          return false;
      }
}

function mergeArrays(...arrays) {
    let jointArray = []

    arrays.forEach(array => {
        jointArray = [...jointArray, ...array]
    })
    const uniqueArray = jointArray.reduce((newArray, item) =>{
        if (newArray.includes(item)){
            return newArray
        } else {
            return [...newArray, item]
        }
    }, [])
    return uniqueArray
}


const checkCss = async (page, arrayCssUsed, arrayCssUnused, styles) => {
    // try {
        //  await readdir('css/', function(err, filenames) {
        //     if (err) {
        //       onError(err);
        //       return;
        //     }
            styles.forEach(async function(styleOfCss) {
                // console.log('Lecture de ' + filename);
                // fs.readFile('css/' + filename, 'utf-8', function(err, content) {
                    // if (err) {
                    //     onError(err);
                    //     return;
                    // }
                    // console.log('\t on a pu le lire');
                    const cssUsed = styleOfCss.match(/\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*\s*\{/gm);
                    if(cssUsed != null || cssUsed != undefined){
                        // console.log('\t check du css');
                        let tempClassChecked = [];
                        cssUsed.forEach(async function(cssClassName){
                            const classNamePurified = cssClassName.replace(/{/,'');
                            // console.log('Check de '+classNamePurified);
                            // console.log(tempClassChecked.includes(classNamePurified));
                            if(arrayCssUsed.includes(classNamePurified) || tempClassChecked.includes(classNamePurified)){
                                console.log('déjà dans l array : ' + classNamePurified);
                                // return;
                            } else {
                                console.log('Check selector ' + classNamePurified);
                                tempClassChecked.push(classNamePurified);
                                try {
                                    const tests = await page.evaluate(selector =>{
                                        return [...document.querySelectorAll(selector)];
                                    }, classNamePurified);
                                    // console.log(tests);
                                    // console.log(tests.length + ' pour ' + classNamePurified);
                                    // return process.kill(process.pid);
                                    if(tests != undefined && tests.length > 0){
                                        console.log(classNamePurified + ' ajouté à la liste des CSS utilisés');
                                        arrayCssUsed.push(classNamePurified);
                                        const index = arrayCssUnused.indexOf(classNamePurified);
                                        if (index > -1) {
                                            arrayCssUnused.splice(index, 1);
                                        }
                                        // return;
                                    } else {
                                        console.log(classNamePurified + ' non utilisé');
                                        if(arrayCssUnused.includes(classNamePurified)){
                                            // return;
                                        } else {
                                            arrayCssUnused.push(classNamePurified);
                                            // return;
                                        }
                                    }
                                } catch(error){
                                    console.log(error);
                                }
                            }
                        });
                    }
                    // return process.kill(process.pid);
                    // console.log('\n \n LECTURE DE : ' + filename + ' TERMINEE \n \n');
                    // return true;         
            //   });
            });
            // console.log('\n \n FOR EACH TERMINEEEEE \n \n');
            // return process.kill(process.pid);
            // return true;
        // });
    // } catch (err){
    //     console.log(err);
    // }
    // console.log('\n \n FIN DU TRY CATCH \n \n')
    // console.log('\n\n IN THE EEEEEEND \n\n');
    // return true;
}

const getAllUrl = async (browser, urlList, urlListCrawled, arrayCssUsed, arrayCssUnused) => {
    if(urlList.length > 0){
        let page = await browser.newPage();
        const url = urlList.shift();
        let styles = [];
        if(urlListCrawled.includes(url)){
            return getAllUrl(browser, urlList, urlListCrawled, arrayCssUsed, arrayCssUnused);
        }
        console.log('Check de l\'url : '+url);
        page.on('response',async response => {
            if(response.request().resourceType() === 'stylesheet') {
                const url = await response.url();
                const styleContent = await response.text();
                styles.push(styleContent);
                // const nameCss = url.match(/[^/\\&\?]+\.\w{3,4}(?=([\?&].*$|$))/);
                // if(nameCss != null || nameCss != undefined){
                //     fs.access('./css/'+nameCss[0], fs.F_OK, (err) => {
                //         if (err) {
                //             fs.writeFileSync('./css/'+nameCss[0], styleContent);
                //         }
                //     });
                // }
            }
        });
        try {
            await page.goto(url);
        } catch (err) {
            console.error(err.message);
            return getAllUrl(browser, urlList, urlListCrawled, arrayCssUsed, arrayCssUnused);
        }
        await page.waitForSelector('body');
        const allHrefs = await page.evaluate(() =>
            [...document.querySelectorAll('a[href*="local.selexium.com"]')].map(link => link.href)
        );
        const allDataUrls = await page.evaluate(() => 
                [...document.querySelectorAll('[data-url]')].map(function(element){
                    const dataUrl = element.getAttribute('data-url');
                    if(isBase64(dataUrl) == false){
                        if(dataUrl.includes('local.selexium.com') && !dataUrl.startsWith('#') && !dataUrl.startsWith('mailto') && !dataUrl.includes('linkedin.com') && !dataUrl.includes('facebook.com') && !dataUrl.includes('twitter.com')){
                            return dataUrl;
                        } else {
                            return ;
                        } 
                    } else {
                        let decodeUrl = atob(dataUrl);
                        if(decodeUrl.startsWith('/')){
                            decodeUrl = 'http://local.selexium.com' + decodeUrl;
                        }
                        if(decodeUrl.includes('local.selexium.com') && !decodeUrl.startsWith('#') && !decodeUrl.startsWith('mailto') && !decodeUrl.includes('linkedin.com') && !decodeUrl.includes('facebook.com') && !decodeUrl.includes('twitter.com')){
                            return decodeUrl;
                        } else {
                            return ;
                        } 
                    }
                })    
        );
        
        urlListCrawled.push(url);
        urlList = mergeArrays(urlList,allHrefs,allDataUrls);

        await checkCss(page, arrayCssUsed, arrayCssUnused, styles);
        console.log('\n\n ON SORT DU CHECKCSS \n\n');

        await page.close();
        // if(urlList.length > 200){
        //     urlList = [];
        // }
        return getAllUrl(browser, urlList, urlListCrawled, arrayCssUsed, arrayCssUnused);
    } else {
        // console.log('Fin de la récursivité');
        return [urlListCrawled, arrayCssUsed, arrayCssUnused];
    }
    // console.log('Si on passe là, il y a un léger problème.');
}


const scrap = async () => {
    const browser = await puppeteer.launch({ headless: false });
    let urlListCrawled = [];
    let arrayCssUsed = [];
    let arrayCssUnused = [];
    let urlList = ["http://local.selexium.com/"];
    const result = await getAllUrl(browser, urlList, urlListCrawled, arrayCssUsed, arrayCssUnused);
    browser.close();
    return result;
}

scrap()
  .then(value => {
        // console.log('On est dans le then du scrap ?');
        // console.log(value);
        fs.writeFileSync('./pagesCrawled.txt', value[0].join ('\n') , {flag: "w"});
        fs.writeFileSync('./classUsed.txt', value[1].join ('\n') , {flag: "w"});
        fs.writeFileSync('./classPasUsed.txt', value[2].join ('\n') , {flag: "w"});
  })
  .catch(e => console.log(`error: ${e}`))

//  const getAllUrl = async (browser, url) => {
//     const page = await browser.newPage();
//     if(url == undefined || url == ''){
//         url = 'https://www.selexium.com/';
//     }
//     await page.goto(url);
//     await page.waitForSelector('body');
//     const allHrefs = await page.evaluate(() =>
//       [...document.querySelectorAll('a[href*="www.selexium.com"]')].map(link => link.href)
//     );
//     const allDataUrls = await page.evaluate(() => 
//           [...document.querySelectorAll('[data-url]')].map(function(element){
//               const dataUrl = element.getAttribute('data-url');
//               if(isBase64(dataUrl) == false){
//                   return dataUrl;
//               } else {
//                   let decodeUrl = atob(dataUrl);
//                   if(decodeUrl.startsWith('/')){
//                       decodeUrl = 'https://www.selexium.com' + decodeUrl;
//                   }
//                   return decodeUrl;
//               }
              
//           })    
//     );
//     const allUrls = [...allHrefs,...allDataUrls];
//     return allUrls;
//   }

//OLD SCRAP
// const browser = await puppeteer.launch({ headless: false });
    // let urlListCrawled = [];
    // let urlList = ["https://www.selexium.com/"];
    // const result = await getAllUrl(browser, urlList);
    // let count = 0;
    // console.log('Avant les splices : '+urlList.length);
    // while(urlList.length != 0){
        // urlList.forEach(function(url){
        //     // console.log(url);
        //     const index = urlList.indexOf(url);
        //     // console.log(index);
        //     urlList.splice(index,1);
        //     console.log(urlList.length)
        // });
    // }
    // 
    //     console.log(count);
    //     let tempUrlList = [];
    //     urlList.forEach(async function(url){
    //         if(urlListCrawled.includes(url)){
    //             console.log('On rentre dans le if');
    //             return;
    //         } else {
    //             console.log('Dans le else, nous rentrons.');
    //             const urlListCurrent = await getAllUrl(browser, url);
    //             tempUrlList.push(urlListCurrent);
    //             urlListCrawled.push(url);
    //             const index = urlList.indexOf(url);
    //             urlList.splice(index,1);
    //             console.log(url,index);
    //             console.log('Taille de la liste : '+urlList.length);
    //         }
    //     });
    //     tempUrlList.forEach(function(tempUrl){
    //         urlList.concat(tempUrlList);
    //     });
    //     count++;
    // }
    // browser.close();
    // return urlList;

// (async () => {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();
//   page.on('response',async response => {
//     if(response.request().resourceType() === 'stylesheet') {
//         const url = await response.url();
//         const styleContent = await response.text();
//         const nameCss = url.match(/[^/\\&\?]+\.\w{3,4}(?=([\?&].*$|$))/);
//         if(nameCss != null || nameCss != undefined){
//             fs.writeFileSync('./css/'+nameCss[0], styleContent);
//         }

//         fs.readdir('css/', function(err, filenames) {
//             if (err) {
//               onError(err);
//               return;
//             }
//             filenames.forEach(function(filename) {
//               fs.readFile('css/' + filename, 'utf-8', function(err, content) {
//                 // fs.unlink('./usedCss/'+filename+'.txt', (err) => {
//                 //     console.log('./usedCss/'+filename+'.txt was deleted');
//                 //   });
//                 if (err) {
//                   onError(err);
//                   return;
//                 }
//                 const cssUsed = content.match(/\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*\s*\{/gm);
//                 if(cssUsed != null || cssUsed != undefined){
//                     cssUsed.forEach(async function(cssClassName){
//                         const classNamePurified = cssClassName.replace(/{/,'');
//                         let classExist = '';
//                         try {
//                           await page.waitForSelector(classNamePurified)
//                           classExist = 'trouvé dans le DOM';
//                         } catch (error) {
//                           classExist = 'classe non utilisée';
//                         }

//                         fs.writeFileSync('./usedCss/'+filename+'.txt', classNamePurified + ' => ' + classExist + '\n' , {flag: "a"});
//                     });
//                     // console.log(cssUsed);
//                     // fs.writeFileSync('./usedCss/'+filename+'.txt', cssUsed.replace(/{,/,'/n'));
//                 }
//               });
//             });
//           });
        
//     }
//   });
//   await page.goto('https://www.selexium.com/');
//   await browser.close();
// })();