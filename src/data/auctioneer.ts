// The auctioneer's patter, in the manner of a 1920s sale room: quick, clipped, one price at a time.
// Every line carries exactly one {price} (or none) so it can be recorded around a number clip.
export const AUCTIONEER = {
  open: [
    'Now then, gentlemen. Who will start me at {price}?',
    'A good piece, this. {price} to begin. Anybody?',
    'I am looking for {price}. Who will open?',
    'Let us start sensibly. {price}, anywhere in the room?',
    'On the table now. Who will give me {price}?',
  ],
  roomBid: [
    '{price} I am bid.',
    '{price}, thank you, sir.',
    '{price} on my left.',
    '{price}, at the back of the room.',
    '{price}, the gentleman by the pillar.',
    '{price} bid. Do I hear more?',
    '{price}. Against you, sir.',
    '{price} in the room.',
  ],
  youBid: [
    '{price}, the gentleman from Giza.',
    '{price}, a new bidder. Thank you.',
    '{price}, from the merchant on the aisle.',
    '{price}, with you, sir.',
  ],
  selimBid: [
    '{price}, Mr Kassab.',
    '{price}. Mr Kassab is with us today.',
  ],
  once: [
    'At {price}. Any advance? Going once.',
    '{price}. Are we all done? Going once.',
    'Selling at {price}. Going once.',
    '{price}, and it is not dear. Going once.',
  ],
  twice: [
    'Fair warning, at {price}. Going twice.',
    'Last call at {price}. Going twice.',
    'The hammer is up at {price}. Going twice.',
  ],
  nobodyOnce: [
    'Nobody at {price}? Come, gentlemen. Going once.',
    'No one at {price}? Surely not. Going once.',
  ],
  nobodyTwice: [
    'Still nobody at {price}. Going twice.',
    'I cannot give it away, gentlemen. {price}. Going twice.',
  ],
  sold: [
    'Sold! {price}.',
    'Sold, at {price}. Thank you.',
    'Down she goes, at {price}.',
    'Sold for {price}. Next lot, please.',
  ],
  noSale: [
    'No sale. The lot is withdrawn.',
    'Bought in. Next lot, please.',
    'Not enough, gentlemen. The lot goes back to the owner.',
  ],
};

export type AuctionCall = keyof typeof AUCTIONEER;
