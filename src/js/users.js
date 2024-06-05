import * as THREE from 'three';

const response = await fetch("http://127.0.0.1:8000/users/");

// use this for getting passed the Ngrok issue
// const response = await fetch("https://randomuser.me/api/?results=5");
let users = await response.json();

const userData = dataCleanup(users.results);
const userDataGroupings = [];

function dataCleanup(data) {
  let userArray = data;
  let newUserArray = [];
  for(const user of userArray) {
    const newUserData = {};
    newUserData.name = user.name.first + " " + user.name.last;
    newUserData.location = user.location.city + ", " + user.location.country
    newUserData.dob = user.dob.date;
    newUserData.age = user.dob.age;
    newUserData.postcode = user.location.postcode;
    newUserData.coordinates = user.location.coordinates.latitude + ", " + user.location.coordinates.longitude;
    newUserData.picture = user.picture;
    newUserData.email = user.email;
    newUserData.phone = user.phone;
    newUserData.cell = user.cell;
    newUserData.nat = user.nat;
    newUserData.gender = user.gender;
    newUserArray.push(newUserData);
  }
  return newUserArray;
}

// sizes include 'thumbnail', 'medium', or 'large'
function userImageTextureBySize(user, size,) {
  const textureLoader = new THREE.TextureLoader();
  // this is a proxy bypass CORS issue with the API image
  const proxyUrl = 'https://api.allorigins.win/raw?url=';
  const url = proxyUrl + user.picture[size];

  return textureLoader.load(url)
}

export { userData, userDataGroupings, dataCleanup, userImageTextureBySize}
