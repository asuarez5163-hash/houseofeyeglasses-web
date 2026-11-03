// Código postal → estado y qué estados exigen verificar la receta con el doctor. FUENTE ÚNICA de esa regla (la web la lee en el
// paso 1 del configurador; el Central solo guarda lo que la web manda: CP, estado y datos del doctor).
//
// ZIPS: rangos [desde, hasta, estado] de los ZIP de 5 dígitos, sacados del dataset offline `zipcodes` (42,788 ZIP, 11/03/2026);
//   un ZIP entre dos rangos de estados distintos devuelve null y la web pide elegir el estado (nunca se adivina).
// STRICT: estados donde se pide el doctor para verificar la receta antes de hacer los lentes.
//   · Los 21 estados que licencian ópticos (COA / ABO-NCLE, optogrid.com 09/2026): AK AZ AR CA CT FL GA HI KY MA NV NJ NY NC OH RI SC TN VT VA WA.
//   · NH (solo registro) y TX (22 TAC §279.5: dispensar sin receta válida = práctica ilegal de optometría), más FL (Estatutos §484.013(1)(c):
//     es ilegal dispensar lentes "sin que se le haya entregado una receta") y NY (Educ. Law art. 144: solo con receta de médico/optómetra).
//   · Territorios y direcciones militares: igual, por prudencia.
//   El resto de estados no tiene licencia de óptico; allí se escribe la receta y se confirma que está vigente, como siempre.
//   Es una tabla PROVISIONAL de prudencia (errar hacia pedir el doctor, no hacia saltarlo): confirmar con el board/abogado de cada estado antes de cobrar en vivo.
(() => {
  'use strict';
  const ZIPS = '0050100544NY,0060100795PR,0080100851VI,0090100988PR,0100102791MA,0280102940RI,0303103897NH,0390104992ME,0500105495VT,0550105544MA,0560105907VT,0600106389CT,0639006390NY,0640106928CT,0700108989NJ,0900009904AE,0990509905NJ,0990809978AE,0998009984NJ,1000114925NY,1500119640PA,1970119980DE,2000120098DC,2010120199VA,2020120586DC,2058820588MD,2059020597DC,2059820598VA,2059920599DC,2060121930MD,2200324658VA,2470126886WV,2700628909NC,2900129945SC,3000231999GA,3200333994FL,3400034099AA,3410134997FL,3500436925AL,3701038589TN,3860139776MS,3981339901GA,4000342788KY,4300145999OH,4600147997IN,4800149971MI,5000152809IA,5300154990WI,5500156763MN,5690156999DC,5700157799SD,5800158856ND,5900159937MT,6000162999IL,6300165899MO,6600267954KS,6800169367NE,7000171497LA,7160172642AR,7264372643MO,7264472959AR,7300173199OK,7330173344TX,7340173951OK,7396073960TX,7400174966OK,7500179999TX,8000181658CO,8200183128WY,8320183406ID,8341483414WY,8341583877ID,8400184791UT,8500186556AZ,8700188439NM,8851088595TX,8888888888DC,8890189883NV,9000196162CA,9620096698AP,9670196797HI,9679996799AS,9680196898HI,9691096932GU,9693996940PW,9694196944FM,9695096952MP,9696096970MH,9700197920OR,9800199403WA,9950199950AK';
  const RANGES = ZIPS.split(',').map(r => [Number(r.slice(0, 5)), Number(r.slice(5, 10)), r.slice(10)]);
  const STRICT = new Set('AK AZ AR CA CT FL GA HI KY MA NV NJ NY NC OH RI SC TN VT VA WA NH TX PR VI GU AS MP AA AE AP FM MH PW'.split(' '));
  const NAMES = {
    AL: ['Alabama', 'Alabama'],
    AK: ['Alaska', 'Alaska'],
    AZ: ['Arizona', 'Arizona'],
    AR: ['Arkansas', 'Arkansas'],
    CA: ['California', 'California'],
    CO: ['Colorado', 'Colorado'],
    CT: ['Connecticut', 'Connecticut'],
    DE: ['Delaware', 'Delaware'],
    DC: ['Washington, D.C.', 'Washington, D.C.'],
    FL: ['Florida', 'Florida'],
    GA: ['Georgia', 'Georgia'],
    HI: ['Hawaii', 'Hawái'],
    ID: ['Idaho', 'Idaho'],
    IL: ['Illinois', 'Illinois'],
    IN: ['Indiana', 'Indiana'],
    IA: ['Iowa', 'Iowa'],
    KS: ['Kansas', 'Kansas'],
    KY: ['Kentucky', 'Kentucky'],
    LA: ['Louisiana', 'Luisiana'],
    ME: ['Maine', 'Maine'],
    MD: ['Maryland', 'Maryland'],
    MA: ['Massachusetts', 'Massachusetts'],
    MI: ['Michigan', 'Míchigan'],
    MN: ['Minnesota', 'Minnesota'],
    MS: ['Mississippi', 'Misisipi'],
    MO: ['Missouri', 'Misuri'],
    MT: ['Montana', 'Montana'],
    NE: ['Nebraska', 'Nebraska'],
    NV: ['Nevada', 'Nevada'],
    NH: ['New Hampshire', 'Nuevo Hampshire'],
    NJ: ['New Jersey', 'Nueva Jersey'],
    NM: ['New Mexico', 'Nuevo México'],
    NY: ['New York', 'Nueva York'],
    NC: ['North Carolina', 'Carolina del Norte'],
    ND: ['North Dakota', 'Dakota del Norte'],
    OH: ['Ohio', 'Ohio'],
    OK: ['Oklahoma', 'Oklahoma'],
    OR: ['Oregon', 'Oregón'],
    PA: ['Pennsylvania', 'Pensilvania'],
    RI: ['Rhode Island', 'Rhode Island'],
    SC: ['South Carolina', 'Carolina del Sur'],
    SD: ['South Dakota', 'Dakota del Sur'],
    TN: ['Tennessee', 'Tennessee'],
    TX: ['Texas', 'Texas'],
    UT: ['Utah', 'Utah'],
    VT: ['Vermont', 'Vermont'],
    VA: ['Virginia', 'Virginia'],
    WA: ['Washington', 'Washington'],
    WV: ['West Virginia', 'Virginia Occidental'],
    WI: ['Wisconsin', 'Wisconsin'],
    WY: ['Wyoming', 'Wyoming'],
    PR: ['Puerto Rico', 'Puerto Rico'],
    VI: ['U.S. Virgin Islands', 'Islas Vírgenes de EE. UU.'],
    GU: ['Guam', 'Guam'],
    AS: ['American Samoa', 'Samoa Estadounidense'],
    MP: ['Northern Mariana Islands', 'Islas Marianas del Norte'],
    AA: ['Military address (APO/FPO)', 'Dirección militar (APO/FPO)'],
    AE: ['Military address (APO/FPO)', 'Dirección militar (APO/FPO)'], AP: ['Military address (APO/FPO)', 'Dirección militar (APO/FPO)'],
    FM: ['Micronesia', 'Micronesia'], MH: ['Marshall Islands', 'Islas Marshall'], PW: ['Palau', 'Palaos'],
  };
  // 5-digit ZIP → 'FL' | null (not found / between two states)
  function stateOf(zip) {
    const z = String(zip == null ? '' : zip).trim();
    if (!/^\d{5}$/.test(z)) return null;
    const n = Number(z);
    let lo = 0, hi = RANGES.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, r = RANGES[mid];
      if (n < r[0]) hi = mid - 1; else if (n > r[1]) lo = mid + 1; else return r[2];
    }
    return null;
  }
  const nameOf = (code, lang) => { const n = NAMES[code]; return n ? (lang === 'es' ? n[1] : n[0]) : String(code || ''); };
  window.hoeRxStates = { stateOf, nameOf, strict: code => STRICT.has(code), codes: () => Object.keys(NAMES), has: code => code in NAMES };
})();
