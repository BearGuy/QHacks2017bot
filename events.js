'use strict';
const categories =require('./categories');

const events = [
  {
    id: 1,
    title: 'Shakespeare in the Park',
    description: 'A lovely evening of creating amazing theater in a wonderful atmosphere',
    item_url: 'https://www.facebook.com/events/982746455180662/',
    image_url: 'http://noho.bid/sites/default/files/field/image/IMG_6136.jpg',
    category: categories.ARTS_AND_THEATER,
    location:{
      place: 'Woodward Park',
      city: 'Fresno, California',
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
    item_url: 'https://en.wikipedia.org/wiki/Sharknado',
    image_url: 'http://cdn.earwolf.com/wp-content/uploads/2013/07/sharknado.jpg',
    category: categories.MOVIES,
    location:{
      place: "Cineplex",
      city: 'Kingston, Ontario',
      lat: '45.00',
      long: '44.00'
    },
    startTime:'2017-02-04T00:05:00-0500',
    endTime:'2017-04-05T23:29:00-0400',
  },
  {
    id: 3,
    title: 'U2 Concert',
    description: 'Watch U2 play live at the KRock center!',
    item_url: 'http://www.u2gigs.com/',
    image_url: 'http://www.billboard.com/files/styles/article_main_image/public/media/U2-O2-Arena-oct-2015-billboard-650.jpg',
    category: categories.CONCERTS,
    location: {
      place: 'BC Place Stadium',
      city: 'Vancouver, BC',
      
      lat: '45.00',
      long: '44.00'
    },
    startTime:'2017-05-07T19:00:00-0400',
    endTime:'2017-05-07T23:00:00-0400',
  },
  {
    id: 4,
    title: 'Stages Khaos Mixer',
    description: 'A lovely evening of sexual exploration and self discovery',
    item_url: 'https://www.facebook.com/events/261388624284058/',
    image_url: 'https://scontent-yyz1-1.xx.fbcdn.net/v/t31.0-8/16487859_610220285838408_7454237602897017997_o.jpg?oh=eca1d089c047c835297a6cad492951d8&oe=5943FCBA',
    category: categories.ADULT_SOCIALS,
    location:{
      place: 'Stages Nightclub',
      city: 'Kingston, Ontario',
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
    item_url: 'https://www.facebook.com/events/1166556153393494/',
    image_url: 'https://scontent-yyz1-1.xx.fbcdn.net/v/t31.0-8/15384639_1808798389398014_192357959430221475_o.jpg?oh=2b8e54e1249e23f057f56926ce1a9563&oe=590C6C90',
    category: categories.EDUCATIONAL,
    location:{
      place: 'Queen\'s University',
      city: 'Kingston, Ontario',
      lat: '45.00',
      long: '44.00'
    },
    startTime:'2017-03-05T18:00:00-0400',
    endTime:'2017-05-05T13:00:00-0400',
  },
];

module.exports = events;