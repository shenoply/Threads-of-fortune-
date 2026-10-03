// The streets of each walkable town map, traced from its painting (see game/systems/streets.ts).
// Points are in the map's own pixels; a point two streets share is a crossing. Free areas are open
// ground (desert, a yard, a square) where you can walk straight.
import type { StreetMap } from '../game/systems/streets';

export const STREETS: Record<string, StreetMap> = {
  // Giza (art/world/giza-district.jpg, 1536 x 1024)
  giza: {
    streets: [
      [[395, 468], [553, 468], [690, 468], [760, 468], [842, 468], [980, 468], [1060, 468], [1145, 468]], // the bazaar street
      [[1145, 40], [1145, 330], [1145, 468], [1145, 690], [1145, 1000]], // the road beside the railway
      [[553, 468], [553, 335]], // up to Arran's door
      [[842, 468], [842, 330]], // up to the coffee house
      [[690, 468], [690, 428]], // Malek's grill
      [[760, 468], [760, 518]], // your stall
      [[1060, 468], [1075, 478]], // into the food souk
      [[980, 468], [980, 612]], // the lane south to the yards
      [[398, 612], [600, 612], [930, 612], [980, 612], [1070, 612]], // along the yard walls
      [[600, 612], [600, 650]], // into the animal market
      [[930, 612], [930, 655]], // into the guard yard
      [[398, 700], [425, 700]], // the animal market's desert gate
      [[1145, 330], [1240, 330], [1275, 330]], // over the line to the station
      [[1240, 330], [1240, 690], [1145, 690]], // the path along the gardens
      [[1240, 690], [1330, 690], [1385, 682]], // down to the ferry landing
    ],
    free: [
      { x: 0, y: 0, w: 398, h: 1024 }, // the desert and the pyramids
      { x: 410, y: 640, w: 380, h: 260 }, // the animal market yard
      { x: 805, y: 645, w: 265, h: 290 }, // the guard yard
      { x: 990, y: 345, w: 150, h: 230 }, // the food souk square
    ],
  },

  // Cairo (art/cities/cairo-1925-map.webp): the east bank town, the two Nile bridges, Gezira and the west bank
  'city-cairo': {
    streets: [
      [[750, 95], [750, 170]], // the station
      [[640, 260], [690, 215], [750, 170], [870, 215], [1000, 240], [1158, 263]], // Emad al-Din and the road to the Khan
      [[1158, 263], [1200, 330], [1224, 405]], // through the Khan to the dealer room
      [[1000, 240], [1030, 330]], // Hagop's shop
      [[750, 170], [760, 300], [800, 380]], // down past the Ezbekiya garden
      [[800, 380], [900, 430], [921, 474], [1000, 520], [1053, 566]], // Abdeen and the Wikala
      [[800, 380], [760, 450], [690, 510]], // to the Qasr el-Nil bridge
      [[690, 510], [600, 540], [560, 553], [430, 560]], // the bridge
      [[580, 550], [640, 620], [698, 690]], // down onto Gezira
      [[430, 560], [330, 600], [225, 600]], // the west bank road to the pyramids
      [[690, 510], [800, 560], [880, 640], [955, 700], [990, 800], [970, 860]], // the corniche south
      [[970, 860], [800, 900], [620, 930], [500, 960], [400, 960], [225, 900]], // the south bridge to the west bank
      [[1053, 566], [1100, 650], [1150, 720], [1224, 803]], // up to the Citadel
      [[1224, 803], [1150, 880], [1110, 930], [970, 860]], // the horse market
      [[1224, 803], [1280, 880], [1316, 921]], // Old Cairo
    ],
    free: [{ x: 740, y: 200, w: 170, h: 170 }, { x: 0, y: 420, w: 230, h: 666 }],
  },
  // Alexandria (art/world/city-alexandria.jpg)
  'city-alexandria': {
    streets: [
      [[1040, 933], [1040, 855]], // the station
      [[1040, 855], [900, 820], [780, 740], [650, 650], [540, 560], [420, 500], [300, 470], [200, 455], [60, 455]], // the tram avenue to Pompey's Pillar
      [[650, 650], [731, 600]], // the Souq el-Attarin
      [[420, 500], [470, 420], [503, 385]], // the Metropole
      [[300, 470], [320, 380], [330, 300], [320, 230], [340, 160], [340, 85]], // the corniche to Ras el-Tin
      [[503, 385], [560, 410], [760, 410], [860, 330], [936, 250]], // along the harbour to the pier
      [[760, 410], [900, 450], [1050, 470], [1180, 450], [1266, 424]], // the warehouses
      [[1040, 855], [1100, 780], [1150, 650], [1200, 520], [1266, 424]], // the dock road from the station
      [[1266, 424], [1330, 300], [1340, 220], [1280, 140], [1245, 85]], // out along the breakwater
    ],
  },
  // Jerusalem (art/world/city-jerusalem.jpg)
  'city-jerusalem': {
    streets: [
      [[90, 60], [140, 250], [230, 440], [330, 560], [440, 627]], // Jaffa Road
      [[440, 627], [330, 720], [250, 850], [160, 1000]], // the road south
      [[330, 720], [203, 666]], // the muleteers
      [[440, 627], [500, 600], [533, 573]], // Jaffa Gate
      [[533, 573], [620, 580], [761, 592], [900, 600], [980, 570], [1082, 534]], // David Street, the Chain Street, the Haram
      [[620, 580], [640, 470], [700, 420], [731, 352]], // Christian Quarter Road to the Sepulchre
      [[900, 600], [920, 470], [1023, 398]], // Bab al-Silsila
      [[980, 570], [1050, 620], [1093, 649]], // to the Mount of Olives path
      [[533, 573], [580, 640], [626, 720]], // the Armenian Quarter
      [[1093, 649], [1200, 560], [1260, 450], [1340, 300], [1300, 200], [1280, 140]], // the road up Mount Scopus
    ],
  },
  // Damascus (art/world/city-damascus.jpg)
  'city-damascus': {
    streets: [
      [[827, 933], [827, 840], [820, 780]], // in at the gate, over the river
      [[820, 780], [760, 650], [700, 530], [663, 420], [620, 300], [580, 150], [560, 100]], // the Souq al-Hamidiyya
      [[790, 700], [890, 624]], // Farid's shop
      [[680, 470], [780, 420], [900, 380], [931, 341]], // to the Umayyad Mosque
      [[760, 650], [600, 640], [442, 662]], // the weavers
      [[700, 530], [550, 500], [400, 490], [337, 486]], // the khan
      [[620, 300], [480, 250], [393, 187]], // the Azm palace
      [[393, 187], [280, 150], [173, 131]], // the citadel
      [[931, 341], [1050, 300], [1150, 250], [1238, 200]], // the old houses
    ],
  },
  // Istanbul (art/world/city-istanbul.jpg)
  'city-istanbul': {
    streets: [
      [[107, 200], [150, 220], [200, 253]], // Sirkeci station
      [[200, 253], [250, 320], [307, 373], [400, 420], [500, 450], [590, 470]], // along the Golden Horn
      [[590, 470], [680, 420], [746, 400], [820, 350], [860, 320]], // the Galata Bridge
      [[860, 320], [800, 250], [720, 190], [692, 160], [715, 68]], // up to Pera and the Galata tower
      [[590, 470], [572, 560]], // the Spice Bazaar
      [[572, 560], [480, 620], [399, 667]], // the Grand Bazaar
      [[399, 667], [280, 720], [133, 746]], // the horse market
      [[107, 200], [120, 400], [130, 600], [133, 746]], // beside the railway
      [[572, 560], [700, 620], [800, 680], [907, 746]], // to the mosques
      [[907, 746], [1000, 700], [1100, 660], [1173, 627]], // Topkapi
    ],
  },
  // Amman (art/world/city-amman.jpg): the stream is crossed only at its bridges
  'city-amman': {
    streets: [
      [[853, 920], [853, 960]], // the stone bridge
      [[853, 920], [880, 820], [880, 700], [820, 665], [773, 627]], // up the east bank and over to the souq
      [[773, 627], [830, 550], [900, 500], [932, 492]], // the mosque
      [[932, 492], [950, 400], [980, 300], [1000, 200], [950, 120], [906, 80]], // up to the citadel
      [[880, 700], [1000, 680], [1100, 660], [1173, 640]], // the Roman theatre
      [[1173, 640], [1200, 500], [1250, 400], [1293, 267]], // the villa
      [[853, 960], [720, 945], [600, 900], [500, 880], [360, 867]], // over the bridge to the Legion post
      [[773, 627], [650, 640], [560, 700], [500, 800], [500, 880]], // the steps down from the souq
      [[773, 627], [650, 560], [560, 480], [500, 400], [450, 330], [350, 250], [266, 173]], // the road to Raghadan
    ],
    free: [{ x: 0, y: 600, w: 480, h: 420 }],
  },
  // Baghdad (art/world/city-baghdad.jpg): the Tigris is crossed only at its bridges
  'city-baghdad': {
    streets: [
      [[240, 747], [200, 700], [187, 681]], // the gate
      [[187, 681], [250, 640], [320, 600], [400, 560]], // in to the mosque
      [[400, 560], [380, 500], [360, 439], [320, 360], [260, 300], [239, 240]], // the bazaar to the carpet souq
      [[400, 560], [470, 600], [533, 627]], // the levies' post
      [[533, 627], [480, 680], [440, 720]], // the khan
      [[533, 627], [650, 600], [780, 575], [987, 587], [1150, 600], [1250, 610]], // the bridge of boats
      [[780, 575], [790, 700], [810, 800]], // down to the quay
      [[1250, 610], [1250, 500], [1180, 420], [1158, 373]], // the palace
      [[239, 240], [400, 250], [560, 280], [700, 250], [900, 200], [1020, 140], [1250, 140], [1200, 250], [1158, 373]], // the north bridge
    ],
    free: [{ x: 0, y: 720, w: 340, h: 366 }],
  },
};
