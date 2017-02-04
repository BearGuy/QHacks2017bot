'use strict';
const categories =require('./categories');


const events = [
  {
    id: 1,
    title: 'Shakespeare in the Park',
    description: 'A lovely evening of creating amazing theater in a wonderful atmosphere',
    image_url: '',
    category: categories.ARTS_AND_THEATER,
    location:{
      lat: '45.00',
      long: '44.00'
    },
    startTime:'2017-02-05T19:00:00-0400',
    endTime:'2017-02-05T23:00:00-0400',
  },
  {
    id: 2,
    title: 'Sharknado',
    description: 'Come watch a scarely terrible movie with the rest of the crew tonight! Alcohol permitted, jokes appreciated',
    image_url: '',
    category: categories.MOVIES,
    location:{
      lat: '45.00',
      long: '44.00'
    },
    startTime:'2017-02-05T19:00:00-0400',
    endTime:'2017-01-05T23:29:00-0400',
  },
  {
    id: 3,
    title: 'U2 Concert',
    description: 'Watch U2 play live at the KRock center!',
    image_url: '',
    category: categories.CONCERTS,
    location: {
      lat: '45.00',
      long: '44.00'
    },
    startTime:'2017-02-05T19:00:00-0400',
    endTime:'2017-02-05T23:00:00-0400',
  },
  {
    id: 4,
    title: 'Stephens sex party',
    description: 'A lovely evening of sexual exploration and self discovery',
    image_url: '',
    category: categories.ADULT_SOCIALS,
    location:{
      lat: '45.00',
      long: '44.00'
    },
    startTime:'2017-02-05T19:00:00-0400',
    endTime:'2017-02-05T23:00:00-0400',
  },
  {
    id: 5,
    title: 'QHacks',
    description: 'Kingston\'s best hackathon',
    image_url: '',
    category: categories.EDUCATIONAL,
    location:{
      lat: '45.00',
      long: '44.00'
    },
    startTime:'2017-03-05T18:00:00-0400',
    endTime:'2017-05-05T13:00:00-0400',
  },
];

module.exports = events;