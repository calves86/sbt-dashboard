/* ===== SBT League Auth Config =====
 *
 * TO CHANGE A PIN:
 *   1. Open your browser console (F12) on any page
 *   2. Run this command (replace 'yournewpin' with the actual PIN):
 *        crypto.subtle.digest('SHA-256', new TextEncoder().encode('yournewpin'))
 *          .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
 *   3. Copy the hash output and paste it below as the pin_hash value
 *
 * DEFAULT PIN for both users is: 1234  (change before sharing with co-commish)
 * ===================================== */

window.COMM_AUTH = {
  leagueKey:  'sbt_comm_v1',   // sessionStorage key — change to invalidate all sessions
  leagueName: 'Sigma Beta Tau Fantasy Football',

  users: [
    {
      id:       'sbt-commish',
      name:     'Chris',                                             // ← update name
      role:     'commissioner',
      pin_hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'  // PIN: 1234
    },
    {
      id:       'sbt-co-commish',
      name:     'Co-Commissioner',                                   // ← update name
      role:     'co-commissioner',
      pin_hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'  // PIN: 1234
    },
  ]
};
