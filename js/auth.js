let registerMode = false;

const username = document.getElementById("username");
const email = document.getElementById("email");
const password = document.getElementById("password");
const button = document.getElementById("authButton");
const statusText = document.getElementById("status");
const switchMode = document.getElementById("switchMode");
const switchText = document.getElementById("switchText");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

function updateUI(){
if(registerMode){
username.style.display="block";
button.textContent="Create Account";
switchText.innerHTML='Already have an account? <span id="switchMode">Login</span>';
loginTab.classList.remove("active");
registerTab.classList.add("active");
}else{
username.style.display="none";
button.textContent="Login";
switchText.innerHTML='Don\'t have an account? <span id="switchMode">Register</span>';
registerTab.classList.remove("active");
loginTab.classList.add("active");

}

document
.querySelector("#switchMode")
.onclick=toggleMode;

}

function toggleMode(){
registerMode=!registerMode;

updateUI();

}

switchMode.onclick=toggleMode;
loginTab.onclick=()=>{
registerMode=false;

updateUI();

}

registerTab.onclick=()=>{
registerMode=true;

updateUI();

}

button.onclick=async()=>{
statusText.textContent="";
if(registerMode){
const {error}=await window.supabaseClient.auth.signUp({
email:email.value,
password:password.value,
options:{
data:{
username:username.value

}

}

});

if(error){
statusText.textContent=error.message;
}else{

statusText.textContent="Account Exists, check your email.";
}

}else{
const {error}=await window.supabaseClient.auth.signInWithPassword({
email:email.value,
password:password.value
});
if(error){
statusText.textContent="Unknown Error!";
}else{
location.href="pages/home.html";

}

}

}
