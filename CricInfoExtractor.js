//download html using Axios
//extract Information using JSDOM
//convert Matches to teams
//Save team to Excel using Excel For Node
//create folder and save pdf using pdf-lib

//npm init -y
//npm install minimist->use to read information given to console
//npm install axios
//npm install jsdom
//npm install excel4node
//npm install pdf-lib

//node CricInfoExtractor.js --excel=IPL.csv --dataDir=IPL --source=https://sports.ndtv.com/ipl-2020/schedules-fixtures


let minimist=require("minimist");
let axios=require("axios");
let jsdom=require("jsdom");
let excel4node=require("excel4node");
let pdf=require("pdf-lib");
let fs=require("fs");
let path=require("path");
let matches=[];

let args=minimist(process.argv);
// console.log(args.source);
// console.log(args.excel);
// console.log(args.dataDir);

let responseKaPromise=axios.get(args.source);
responseKaPromise.then(function(response){
    let html=response.data;
    

    let dom=new jsdom.JSDOM(html);
    let document=dom.window.document;
    let matchScoreDivs=document.getElementsByClassName('sp-scr_lnk url');
    
    for(let i=0;i<matchScoreDivs.length;i++){
        let matchResult=matchScoreDivs[i].querySelectorAll("div.scr_inf-wrp>.scr_dt-red");
        let teamName=matchScoreDivs[i].querySelectorAll("div.scr_tm-nm");
        let teamScore=matchScoreDivs[i].querySelectorAll("div.scr_tm-scr>span");
        let match={
            t1:"",
            t2:"",
            t1s:"",
            t2s:"",
            result:"",
        };
        match.t1=teamName[0].textContent;
        match.t2=teamName[1].textContent;
        if(teamScore.length==2){
        match.t1s=teamScore[0].textContent;
        match.t2s=teamScore[1].textContent;
        }else if(teamScore.length==1){
            match.t1s=teamScore[0].textContent;
            match.t2s="";
        }else{
            match.t1s="";
            match.t2s="";
        }

        match.result=matchResult[1].textContent;
       matches.push(match);
    }
     let matchkaJSON=JSON.stringify(matches);
     fs.writeFileSync("matches.json",matchkaJSON,"utf-8");

     let teams=[];
     for(let i=0 ;i<matches.length;i++){
        pushTeamInTeamsIfNotAllreadyThere(teams,matches[i].t1);
        pushTeamInTeamsIfNotAllreadyThere(teams,matches[i].t2); 
     }
     
     //putting matches in appropriates teams
     for(let i=0;i<matches.length;i++){
        
        pushMatchInAppropriateTeam(teams,matches[i].t1,matches[i].t2,matches[i].t1s,matches[i].t2s,matches[i].result);
        pushMatchInAppropriateTeam(teams,matches[i].t2,matches[i].t1,matches[i].t2s,matches[i].t1s,matches[i].result);
     }
     
     let teamKaJson=JSON.stringify(teams);
     fs.writeFileSync("teams.json",teamKaJson,"utf8");
     let excelFileName=args.excel;
      prepareExcel(teams,excelFileName);
       let fn=args.dataDir;
       
   prepareFolderAndPdf(teams,fn);
   

    
}).catch((error) => {
//    console.log(error);
  });
  function pushTeamInTeamsIfNotAllreadyThere(teams , teamName){
    let isTeam=teams.some(a=>a.name==teamName);
    if(isTeam==true){
        let tidx=teams.findIndex(a=>a.name==teamName);
    }else{
        let team={
            name:"",
            match:[],
        }
        team.name=teamName
        teams.push(team);
    }

  }
  function pushMatchInAppropriateTeam(teams,homeTeam, OpponentTeam, htscore, otscore,result){
    
    let tidx=teams.findIndex(a=>a.name==homeTeam);
   
    let details={
        selfScore:"",
        vs:"",
        oppScore:"",
        result:""
    };
    details.selfScore=htscore;
    details.vs=OpponentTeam;
    details.oppScore=otscore;
    details.result=result;
    teams[tidx].match.push(details);
  }
  function prepareExcel(teams,excelFileName){
    
    let wb=new excel4node.Workbook();

    for(let i=0;i<teams.length;i++){
        let tsheet=wb.addWorksheet(teams[i].name);

        tsheet.cell(1,1).string("vs");
        tsheet.cell(1,2).string("SelfScore");
        tsheet.cell(1,3).string("OppScore");
        tsheet.cell(1,4).string("result");

        for(let j=0;j<teams[i].match.length;j++){
            tsheet.cell(2+j,1).string(teams[i].match[j].vs);
            tsheet.cell(2+j,2).string(teams[i].match[j].selfScore);
            tsheet.cell(2+j,3).string(teams[i].match[j].oppScore);
            tsheet.cell(2+j,4).string(teams[i].match[j].result);
        }
    }
    wb.write(excelFileName)
  }
  function prepareFolderAndPdf(teams,dataDir){
    
    if(fs.existsSync(dataDir)==false){
        fs.mkdirSync(dataDir);
    }
    

    for(let i=0;i<teams.length;i++){
        let teamFolderName=path.join(dataDir,teams[i].name);
        
        if(fs.existsSync(teamFolderName)==false){
            fs.mkdirSync(teamFolderName);
        }
       

        for(let j=0;j<teams[i].match.length;j++){
            let mat=teams[i].match[j];
            let str=teamFolderName+"=>"+teams[i].name;
            
            createMatchScorePdf(teamFolderName,teams[i].name,mat);
        }
    }
  }
  function createMatchScorePdf(teamFolderName,hometeam,match){
    let matchFileName=path.join(teamFolderName,match.vs+".pdf");

    let templatesFileBytes=fs.readFileSync("IPL.pdf");
    let pdfdockaPromise=pdf.PDFDocument.load(templatesFileBytes);
     pdfdockaPromise.then(function(pdfdoc){
        let page=pdfdoc.getPage(0);
       
        page.drawText(hometeam,{
            x:302,
            y:700,
            size:20
        });
        page.drawText(match.vs,{
            x:303,
            y:669,
            size:20
        });
        
        page.drawText(match.selfScore,{
            x:305,
            y:637,
            size:20
        });
        page.drawText(match.oppScore,{
            x:305,
            y:598,
            size:20,
            });
        page.drawText(match.result,{
            x:304,
            y:558,
            size:20
        });



        let changeByteKaPromise=pdfdoc.save();
        changeByteKaPromise.then(function(changeByte){
            fs.writeFileSync(matchFileName,changeByte);
        });
     })
  }

