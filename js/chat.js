import { supabase } from "./supabase.js";
const {
    data:{session}
}=await supabase.auth.getSession();
if(!session){
location.href="../";

}

const messages=document.getElementById("messages");
const input=document.getElementById("messageInput");
const send=document.getElementById("send");
async function loadMessages(){
const {data,error}=await supabase
.from("messages")
.select("*")
.order("created_at",{ascending:true});
if(error){
console.error(error);
return;

}

messages.innerHTML="";
for(const message of data){
addMessage(message);

}

messages.scrollTop=messages.scrollHeight;

}

function addMessage(message){
const div=document.createElement("div");
div.className="message";
div.innerHTML=
`<span class="username">${message.username}</span>: ${message.content}`;
messages.appendChild(div);

}

send.onclick=sendMessage;
input.addEventListener("keydown",e=>{
if(e.key==="Enter"){
sendMessage();

}

});

async function sendMessage(){
const text=input.value.trim();
if(text==="") return;
const {error}=await supabase
.from("messages")
.insert({
user_id:session.user.id,
username:
session.user.user_metadata.username

??

session.user.email,
content:text

});

if(error){
console.error(error);
return;

}

input.value="";

}

await loadMessages();
supabase
.channel("messages")
.on(
"postgres_changes",
{

event:"INSERT",
schema:"public",
table:"messages"

},

payload=>{
addMessage(payload.new);
messages.scrollTop=messages.scrollHeight;

}

)

.subscribe();
