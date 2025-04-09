// このmain.jsに集約されてdistに反映されるので必ずimportすること
import { fadeIn, slideUp } from './utils/animation';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');

  const element = document.querySelector('.test');
  if (element) {
    fadeIn(element);
    console.log('Fade effect applied to .test element');
  }

  const slideElement = document.querySelector('.l-header');
  if (slideElement) {
    slideUp(slideElement);
    console.log('Slide effect applied to .l-header element');
  }
});

// alert('Hello, Webpack!');
