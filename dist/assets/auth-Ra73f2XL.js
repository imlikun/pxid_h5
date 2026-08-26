import{i as t}from"./index-DC1HCWDD.js";async function n(){let e="";try{e=await t.getAuthToken()||await t.getToken()||""}catch{e=""}return e?!0:(t.openNative("login"),!1)}export{n as r};
