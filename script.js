/* =========================================================
   KYŌKEN CLAN JAVASCRIPT
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

const OFFICER_API =
    "/api/officers";

const OFFICER_REFRESH_INTERVAL =
    30000;


/* =========================================================
   SERVER STATS
   ========================================================= */

const SERVER_STATS_API =
    "/api/server-stats";

const SERVER_STATS_REFRESH_INTERVAL =
    30000;


/* =========================================================
   DISCORD ROLE IDS
   ========================================================= */

const ROLE_IDS = {

    leader:
        "1533687113487351951",

    viceleader:
        "1533687005832024205",

    secretary:
        "1533687577914380298",

    admins:
        "1533696257237975221",

    division1:
        "1533687696495743148",

    division2:
        "1533687836316925983",

    division3:
        "1533687911139119125",

    division4:
        "1533793002638676078",

    division5:
        "1533795938814918657"

};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser =
    null;

let selectedProfileImage =
    null;


/* =========================================================
   OFFICER DATA
   ========================================================= */

const officerData = {

    leader:
        createEmptyOfficer(
            "LEADER",
            "HEADQUARTERS"
        ),

    viceleader:
        createEmptyOfficer(
            "VICE LEADER",
            "HEADQUARTERS"
        ),

    secretary:
        createEmptyOfficer(
            "SECRETARY",
            "HEADQUARTERS"
        ),

    admins:
        [],

    division1:
        createEmptyOfficer(
            "CAPTAIN",
            "1ST DIVISION"
        ),

    division2:
        createEmptyOfficer(
            "CAPTAIN",
            "2ND DIVISION"
        ),

    division3:
        createEmptyOfficer(
            "CAPTAIN",
            "3RD DIVISION"
        ),

    division4:
        createEmptyOfficer(
            "CAPTAIN",
            "4TH DIVISION"
        ),

    division5:
    createEmptyOfficer(
        "CAPTAIN",
        "5TH DIVISION"
    ),

    division6: []

};

/* =========================================================
   CREATE EMPTY OFFICER
   ========================================================= */

function createEmptyOfficer(
    position,
    division
) {

    return {

        id:
            "",

        name:
            `NO ${position} PROFILE`,

        position:
            position,

        division:
            division,

        style:
            "—",

        secondaryStyle:
            "",

        status:
            "OFFLINE",

        description:
            "Officer information will be added soon.",

        image:
            ""

    };

}


/* =========================================================
   PAGE LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initRevealAnimations();

        initNavigationScrollSpy();

        initCustomSelects();

        initPreviousClan();

        initApplicationDiscordLogin();

        initApplicationForm();

        initOfficerModal();

        initProfilePage();

        initManagementDrawer();

        loadDiscordOfficers();

        startOfficerAutoRefresh();

        startServerStatsAutoRefresh();

    }
);


/* =========================================================
   SERVER MEMBER COUNT
   ========================================================= */

async function loadServerStats() {

    const memberCountElement =
        document.getElementById(
            "serverMemberCount"
        );


    if (!memberCountElement) {

        return;

    }


    try {

        const response =
            await fetch(
                SERVER_STATS_API,
                {

                    method:
                        "GET",

                    headers: {

                        Accept:
                            "application/json"

                    },

                    cache:
                        "no-store"

                }
            );


        if (!response.ok) {

            throw new Error(
                `Server stats API returned ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data ||
            !data.success
        ) {

            throw new Error(
                data?.error ||
                "Invalid server stats response."
            );

        }


        const members =
            Number(
                data.members
            );


        if (
            Number.isFinite(
                members
            )
        ) {

            memberCountElement.textContent =
                members.toLocaleString();

        }

    } catch (error) {

        console.error(
            "Kyōken server member count failed:",
            error
        );


        memberCountElement.title =
            "Unable to refresh player count. Retrying automatically.";

    }

}


/* =========================================================
   SERVER STATS AUTO REFRESH
   ========================================================= */

function startServerStatsAutoRefresh() {

    loadServerStats();


    setInterval(
        function () {

            loadServerStats();

        },
        SERVER_STATS_REFRESH_INTERVAL
    );

}


/* =========================================================
   NAVIGATION SCROLL SPY
   ========================================================= */

function initNavigationScrollSpy() {

    const navLinks =
        document.querySelectorAll(
            '.nav-links a[href^="#"]'
        );


    if (!navLinks.length) {

        return;

    }


    const sections =
        Array.from(navLinks)
            .map(function (link) {

                const id =
                    link.getAttribute("href");


                return id
                    ? document.querySelector(id)
                    : null;

            })
            .filter(Boolean);


    if (!sections.length) {

        return;

    }


    function setActiveSection() {

        const nav =
            document.querySelector(".navbar");


        const offset =
            (nav ? nav.offsetHeight : 75) + 35;


        const scrollPosition =
            window.scrollY + offset;


        let currentSection =
            sections[0];


        sections.forEach(
            function (section) {

                if (
                    section.offsetTop <=
                    scrollPosition
                ) {

                    currentSection =
                        section;

                }

            }
        );


        navLinks.forEach(
            function (link) {

                const target =
                    link.getAttribute("href");


                const isActive =
                    currentSection &&
                    target ===
                        `#${currentSection.id}`;


                link.classList.toggle(
                    "active",
                    isActive
                );

            }
        );

    }


    let ticking =
        false;


    function onScroll() {

        if (ticking) {

            return;

        }


        ticking =
            true;


        window.requestAnimationFrame(
            function () {

                setActiveSection();

                ticking =
                    false;

            }
        );

    }


    window.addEventListener(
        "scroll",
        onScroll,
        {
            passive:
                true
        }
    );


    navLinks.forEach(
        function (link) {

            link.addEventListener(
                "click",
                function () {

                    navLinks.forEach(
                        function (item) {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    link.classList.add(
                        "active"
                    );

                }
            );

        }
    );


    setActiveSection();

}


/* =========================================================
   REVEAL ANIMATIONS
   ========================================================= */

function initRevealAnimations() {

    const elements =
        document.querySelectorAll(
            ".reveal"
        );


    if (!elements.length) {

        return;

    }


    if (
        "IntersectionObserver" in window
    ) {

        const observer =
            new IntersectionObserver(

                function (
                    entries
                ) {

                    entries.forEach(
                        function (
                            entry
                        ) {

                            if (
                                entry.isIntersecting
                            ) {

                                entry.target.classList.add(
                                    "visible"
                                );


                                observer.unobserve(
                                    entry.target
                                );

                            }

                        }
                    );

                },

                {
                    threshold:
                        0.12
                }

            );


        elements.forEach(
            function (
                element
            ) {

                observer.observe(
                    element
                );

            }
        );

    } else {

        elements.forEach(
            function (
                element
            ) {

                element.classList.add(
                    "visible"
                );

            }
        );

    }

}


/* =========================================================
   HEADQUARTERS GRID
   ========================================================= */

function getHeadquartersGrid() {

    return document.getElementById(
        "headquartersGrid"
    );

}


/* =========================================================
   DIVISION GRID
   ========================================================= */

function getDivisionGrid() {

    return document.getElementById(
        "divisionGrid"
    );

}


/* =========================================================
   ADMINS GRID
   ========================================================= */

function getAdminsGrid() {

    return document.getElementById(
        "adminsGrid"
    );

}


/* =========================================================
   DISCORD PRESENCE LABEL
   ========================================================= */

function getDiscordPresenceLabel(
    presence
) {

    switch (
        presence
    ) {

        case "online":
            return "ONLINE";

        case "idle":
            return "IDLE";

        case "dnd":
            return "DO NOT DISTURB";

        default:
            return "OFFLINE";

    }

}


/* =========================================================
   CREATE OFFICER CARD
   ========================================================= */

function createOfficerCard(
    officerKey,
    officer,
    number
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "rank-card officer-card";


    card.dataset.officer =
        officerKey;


    card.tabIndex =
        0;


    card.setAttribute(
        "role",
        "button"
    );


    card.setAttribute(
        "aria-label",
        `View ${
            officer?.name ||
            "officer"
        }`
    );


    const officerName =
        officer?.name ||
        "UNKNOWN OFFICER";


    const position =
        officer?.position ||
        "UNKNOWN POSITION";


    const division =
        officer?.division ||
        "HEADQUARTERS";


    card.innerHTML = `

        <span>
            ${String(number).padStart(2, "0")}
        </span>

        <h3>
            ${escapeHTML(
                officerName
            )}
        </h3>

        <div class="officer-card-meta-block">
            <span class="officer-card-meta-label">POSITION</span>
            <div class="officer-card-position">
                ${escapeHTML(position)}
            </div>
        </div>

        <div class="officer-card-meta-block officer-card-division-block">
            <span class="officer-card-meta-label">DIVISION</span>
            <div class="officer-card-division">
                ${escapeHTML(division)}
            </div>
        </div>

        <div class="officer-card-status presence-${
            escapeHTML(
                officer?.discordPresence ||
                "offline"
            )
        }">

            <span class="officer-status-dot"></span>

            <span>
                ${escapeHTML(
                    getDiscordPresenceLabel(
                        officer?.discordPresence
                    )
                )}
            </span>

        </div>

    `;


    return card;

}


/* =========================================================
   RENDER HEADQUARTERS
   ========================================================= */

function renderHeadquartersCards() {

    const grid =
        getHeadquartersGrid();


    const adminsGrid =
        getAdminsGrid();


    const adminsCategory =
        document.getElementById(
            "adminsCategory"
        );


    if (!grid) {

        return;

    }


    grid.innerHTML =
        "";


    const headquarters = [

        {
            key:
                "leader",

            officer:
                officerData.leader

        },

        {
            key:
                "viceleader",

            officer:
                officerData.viceleader

        },

        {
            key:
                "secretary",

            officer:
                officerData.secretary

        }

    ];


    let number =
        1;


    headquarters.forEach(
        function (
            item
        ) {

            grid.appendChild(

                createOfficerCard(

                    item.key,

                    item.officer,

                    number

                )

            );


            number++;

        }
    );


    /* ---------------------------------------------------------
       ADMINS ARE RENDERED IN THEIR OWN SECTION
       --------------------------------------------------------- */

    if (adminsGrid) {

        adminsGrid.innerHTML =
            "";


        officerData.admins.forEach(
            function (
                admin,
                index
            ) {

                const adminKey =
                    `admin:${
                        admin.id ||
                        `fallback-${index}`
                    }`;


                adminsGrid.appendChild(

                    createOfficerCard(

                        adminKey,

                        admin,

                        index + 1

                    )

                );

            }
        );

    }


    if (adminsCategory) {

        adminsCategory.hidden =
            officerData.admins.length === 0;

    }


    if (
        grid.children.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "rank-card";


        empty.innerHTML = `

            <span>
                --
            </span>

            <h3>
                NO HEADQUARTERS OFFICERS
            </h3>

        `;


        grid.appendChild(
            empty
        );

    }


    initOfficerCards();

}


/* =========================================================
   RENDER DIVISIONS
   ========================================================= */

function renderDivisionCards() {

    const grid =
        getDivisionGrid();


    if (!grid) {

        return;

    }


    grid.innerHTML =
        "";


    const divisions = [

        {
            key:
                "division1",

            officer:
                officerData.division1

        },

        {
            key:
                "division2",

            officer:
                officerData.division2

        },

        {
            key:
                "division3",

            officer:
                officerData.division3

        },

        {
            key:
                "division4",

            officer:
                officerData.division4

        },

        {
            key:
                "division5",

            officer:
                officerData.division5

        }

    ];

    const womenDivision =
        Array.isArray(officerData.division6)
            ? officerData.division6
            : [];
   

    divisions.forEach(
        function (
            item,
            index
        ) {

            grid.appendChild(

                createOfficerCard(

                    item.key,

                    item.officer,

                    index + 1

                )

            );

        }
    );

   // WOMEN'S DIVISION
const womenGrid =
    document.getElementById("womenDivisionGrid");

if (womenGrid) {

    womenGrid.innerHTML = "";

    womenDivision.forEach(
        function (
            officer,
            index
        ) {

            const officerKey =
                "division6:" +
                index;

            womenGrid.appendChild(

                createOfficerCard(

                    officerKey,

                    officer,

                    index + 1

                )

            );

        }
    );

}


    initOfficerCards();

}


/* =========================================================
   RENDER ALL OFFICER CARDS
   ========================================================= */

function renderOfficerCards() {

    renderHeadquartersCards();

    renderDivisionCards();

}


/* =========================================================
   OFFICER CARDS
   ========================================================= */

function initOfficerCards() {

    const cards =
        document.querySelectorAll(
            ".officer-card"
        );


    cards.forEach(
        function (
            card
        ) {

            if (
                card.dataset.initialized ===
                "true"
            ) {

                return;

            }


            card.dataset.initialized =
                "true";


            const officer =
                card.dataset.officer;


            if (!officer) {

                return;

            }


            card.addEventListener(
                "click",
                function () {

                    openOfficer(
                        officer
                    );

                }
            );


            card.addEventListener(
                "keydown",
                function (
                    event
                ) {

                    if (
                        event.key ===
                            "Enter" ||
                        event.key ===
                            " "
                    ) {

                        event.preventDefault();


                        openOfficer(
                            officer
                        );

                    }

                }
            );

        }
    );

}


/* =========================================================
   FIND ADMIN
   ========================================================= */

function findAdminByID(
    id
) {

    if (
        !Array.isArray(
            officerData.admins
        )
    ) {

        return null;

    }


    return (
        officerData.admins.find(
            function (
                admin
            ) {

                return String(
                    admin.id
                ) ===
                String(
                    id
                );

            }
        ) ||
        null
    );

}


/* =========================================================
   GET OFFICER DATA
   ========================================================= */

function getOfficerData(officer) {

    if (typeof officer !== "string") {
        return null;
    }


    if (officer.startsWith("admin:")) {

        return findAdminByID(
            officer.substring(6)
        );

    }


    if (officer.startsWith("division6:")) {

        const index =
            Number(
                officer.substring(10)
            );

        if (
            !Array.isArray(
                officerData.division6
            )
        ) {
            return null;
        }

        return (
            officerData.division6[index] ||
            null
        );

    }


    return officerData[officer] || null;

}


/* =========================================================
   LOAD PUBLIC OFFICERS
   ========================================================= */

async function loadDiscordOfficers() {

    try {

        const response =
            await fetch(
                OFFICER_API,
                {

                    method:
                        "GET",

                    headers: {

                        Accept:
                            "application/json"

                    },

                    cache:
                        "no-store"

                }
            );


        if (!response.ok) {

            throw new Error(
                `Officer API returned ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data ||
            !Array.isArray(
                data.officers
            )
        ) {

            throw new Error(
                "Invalid officer API response."
            );

        }


        resetOfficerData();


        data.officers.forEach(
            function (
                officer
            ) {

                const position =
                    officer.position;


                const divisionNames = {
                    division1: "1ST DIVISION",
                    division2: "2ND DIVISION",
                    division3: "3RD DIVISION",
                    division4: "4TH DIVISION",
                    division5: "5TH DIVISION",
                    division6: "WOMEN'S DIVISION"
                };


                const division =
                    divisionNames[position] ||
                    "HEADQUARTERS";


                const convertedOfficer = {

                    id:
                        officer.userId ||
                        "",

                    name:
                        officer.displayName ||
                        "UNKNOWN OFFICER",

                    position:
                        officer.positionName ||
                        "KYŌKEN OFFICER",

                    division:
                        division,

                    style:
                        officer.mainFightingStyle ||
                        "—",

                    secondaryStyle:
                        officer.secondaryFightingStyle ||
                        "",

                    status:
                        officer.status ||
                        "OFFLINE",

                    discordPresence:
                        officer.discordPresence ||
                        "offline",

                    description:
                        officer.description ||
                        "No profile description available.",

                    image:
                        officer.profileImage ||
                        ""

                };


                switch (
                    position
                ) {

                    case "leader":

                        officerData.leader =
                            convertedOfficer;

                        break;


                    case "viceleader":

                        officerData.viceleader =
                            convertedOfficer;

                        break;


                    case "secretary":

                        officerData.secretary =
                            convertedOfficer;

                        break;


                    case "admins":

                        convertedOfficer.position =
                            "ADMIN";

                        convertedOfficer.division =
                            "HEADQUARTERS";

                        officerData.admins.push(
                            convertedOfficer
                        );

                        break;


                    case "division1":

                        officerData.division1 =
                            convertedOfficer;

                        break;


                    case "division2":

                        officerData.division2 =
                            convertedOfficer;

                        break;


                    case "division3":

                        officerData.division3 =
                            convertedOfficer;

                        break;


                    case "division4":

                        officerData.division4 =
                            convertedOfficer;

                        break;


                    case "division5":

                        officerData.division5 =
                            convertedOfficer;

                        break;

                      
                   case "divisions":

                        officerData.division6.push(
                           convertedOfficer
                        );

                        break;

                }

            }
        );


        renderOfficerCards();

    } catch (error) {

        console.error(
            "Kyōken officer sync failed:",
            error
        );


        renderOfficerCards();

    }

}


/* =========================================================
   RESET OFFICER DATA
   ========================================================= */

function resetOfficerData() {

    officerData.leader =
        createEmptyOfficer(
            "LEADER",
            "HEADQUARTERS"
        );


    officerData.viceleader =
        createEmptyOfficer(
            "VICE LEADER",
            "HEADQUARTERS"
        );


    officerData.secretary =
        createEmptyOfficer(
            "SECRETARY",
            "HEADQUARTERS"
        );


    officerData.admins =
        [];


    officerData.division1 =
        createEmptyOfficer(
            "CAPTAIN",
            "1ST DIVISION"
        );


    officerData.division2 =
        createEmptyOfficer(
            "CAPTAIN",
            "2ND DIVISION"
        );


    officerData.division3 =
        createEmptyOfficer(
            "CAPTAIN",
            "3RD DIVISION"
        );


    officerData.division4 =
        createEmptyOfficer(
            "CAPTAIN",
            "4TH DIVISION"
        );


    officerData.division5 =
        createEmptyOfficer(
            "CAPTAIN",
            "5TH DIVISION"
        );

}


/* =========================================================
   OFFICER AUTO REFRESH
   ========================================================= */

function startOfficerAutoRefresh() {

    setInterval(
        function () {

            loadDiscordOfficers();

        },
        OFFICER_REFRESH_INTERVAL
    );

}


/* =========================================================
   OFFICER MODAL
   ========================================================= */

function initOfficerModal() {

    const modal =
        document.getElementById(
            "officerModal"
        );


    if (!modal) {

        return;

    }


    modal.addEventListener(
        "click",
        function (
            event
        ) {

            if (
                event.target ===
                modal
            ) {

                closeOfficer();

            }

        }
    );

}


/* =========================================================
   OPEN OFFICER
   ========================================================= */

function openOfficer(
    officer
) {

    const data =
        getOfficerData(
            officer
        );


    if (!data) {

        return;

    }


    const modal =
        document.getElementById(
            "officerModal"
        );


    if (!modal) {

        return;

    }


    const name =
        document.getElementById(
            "officerName"
        );


    const position =
        document.getElementById(
            "officerPosition"
        );


    const division =
        document.getElementById(
            "officerDivision"
        );


    const style =
        document.getElementById(
            "officerStyle"
        );


    const status =
        document.getElementById(
            "officerStatus"
        );


    const description =
        document.getElementById(
            "officerDescription"
        );


    const profileImage =
        document.getElementById(
            "officerProfileImage"
        );


    const imageFallback =
        document.getElementById(
            "officerImageFallback"
        );


    const editButton =
        document.getElementById(
            "editProfileButton"
        );


    if (name) {

        name.textContent =
            data.name ||
            "UNKNOWN OFFICER";

    }


    if (position) {

        position.textContent =
            data.position ||
            "—";

    }


    if (division) {

        division.textContent =
            data.division ||
            "—";

    }


    if (style) {

        const mainStyle =
            data.style ||
            "—";


        const secondaryStyle =
            data.secondaryStyle ||
            "";


        style.textContent =
            secondaryStyle
                ? `${mainStyle} / ${secondaryStyle}`
                : mainStyle;

    }


    if (status) {

        const discordPresence =
            data.discordPresence ||
            "offline";


        status.textContent =
            getDiscordPresenceLabel(
                discordPresence
            );


        status.classList.remove(
            "status-active",
            "status-offline",
            "status-idle",
            "status-dnd"
        );


        status.classList.add(
            `status-${discordPresence}`
        );

    }


    if (description) {

        description.textContent =
            data.description ||
            "No profile description available.";

    }


    if (
        profileImage &&
        imageFallback
    ) {

        if (
            data.image
        ) {

            profileImage.src =
                data.image;


            profileImage.style.display =
                "block";


            imageFallback.style.display =
                "none";

        } else {

            profileImage.src =
                "";


            profileImage.style.display =
                "none";


            imageFallback.style.display =
                "inline";

        }

    }


    if (editButton) {

        editButton.hidden =
            true;


        editButton.dataset.profileKey =
            officer;


        updateOfficerEditButton(
            editButton,
            officer,
            data
        );

    }


    modal.classList.add(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   OFFICER PROFILE EDIT BUTTON
   ========================================================= */

async function updateOfficerEditButton(
    editButton,
    officerKey,
    officerDataItem
) {

    if (
        !editButton ||
        !officerDataItem
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/me",
                {

                    method:
                        "GET",

                    credentials:
                        "include",

                    headers: {

                        Accept:
                            "application/json"

                    },

                    cache:
                        "no-store"

                }
            );


        if (!response.ok) {

            editButton.hidden =
                true;

            return;

        }


        const data =
            await response.json();


        const user =
            data?.user;


        const permissions =
            user?.permissions ||
            {};


        const allowedPosition =
            [
                "leader",
                "viceleader",
                "secretary",
                "admins",
                "division1",
                "division2",
                "division3",
                "division4",
                "division5"
            ].includes(
                user?.position
            );


        const viewingOwnProfile =
            Boolean(
                user?.id &&
                officerDataItem?.id &&
                String(user.id) ===
                    String(officerDataItem.id)
            );


        editButton.hidden =
            !(
                Boolean(
                    user?.loggedIn !==
                    false
                ) &&
                Boolean(
                    user?.kyokenMember
                ) &&
                allowedPosition &&
                permissions.editOwnProfile ===
                    true &&
                viewingOwnProfile
            );

    } catch (error) {

        console.error(
            "Kyōken edit button permission check failed:",
            error
        );


        editButton.hidden =
            true;

    }

}


/* =========================================================
   OPEN PROFILE EDITOR PAGE
   ========================================================= */

function openProfileEditor() {

    window.location.href =
        "/profile.html";

}


/* =========================================================
   CLOSE OFFICER
   ========================================================= */

function closeOfficer() {

    const modal =
        document.getElementById(
            "officerModal"
        );


    if (!modal) {

        return;

    }


    modal.classList.remove(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";

}


/* =========================================================
   CUSTOM SELECTS
   ========================================================= */

function initCustomSelects() {

    const selects =
        document.querySelectorAll(
            ".custom-select"
        );


    selects.forEach(
        function (
            customSelect
        ) {

            if (
                customSelect.dataset.initialized ===
                "true"
            ) {

                return;

            }


            customSelect.dataset.initialized =
                "true";


            const trigger =
                customSelect.querySelector(
                    ".select-trigger"
                );


            const hiddenInput =
                customSelect.querySelector(
                    'input[type="hidden"]'
                );


            const selectedText =
                customSelect.querySelector(
                    ".selected-text"
                );


            const options =
                customSelect.querySelectorAll(
                    ".select-option"
                );


            if (!trigger) {

                return;

            }


            trigger.addEventListener(
                "click",
                function (
                    event
                ) {

                    event.stopPropagation();


                    closeOtherSelects(
                        customSelect
                    );


                    const isOpen =
                        customSelect.classList.toggle(
                            "open"
                        );


                    trigger.setAttribute(
                        "aria-expanded",
                        String(
                            isOpen
                        )
                    );

                }
            );


            trigger.addEventListener(
                "keydown",
                function (
                    event
                ) {

                    if (
                        event.key ===
                            "Enter" ||
                        event.key ===
                            " "
                    ) {

                        event.preventDefault();


                        trigger.click();

                    }

                }
            );


            options.forEach(
                function (
                    option
                ) {

                    option.addEventListener(
                        "click",
                        function (
                            event
                        ) {

                            event.stopPropagation();


                            const value =
                                option.dataset.value ||
                                "";


                            const label =
                                option.querySelector(
                                    "span"
                                );


                            if (hiddenInput) {

                                hiddenInput.value =
                                    value;

                            }


                            if (
                                selectedText &&
                                label
                            ) {

                                selectedText.textContent =
                                    label.textContent.trim();


                                selectedText.style.color =
                                    "#ffffff";

                            }


                            customSelect.classList.remove(
                                "open"
                            );


                            trigger.setAttribute(
                                "aria-expanded",
                                "false"
                            );

                        }
                    );

                }
            );

        }
    );


    document.addEventListener(
        "click",
        function () {

            closeOtherSelects();

        }
    );

}


/* =========================================================
   SET CUSTOM FIGHTING STYLE
   ========================================================= */

function setCustomFightingStyle(
    selectId,
    value
) {

    const customSelect =
        document.getElementById(
            selectId
        );


    if (!customSelect) {

        return;

    }


    const hiddenInput =
        customSelect.querySelector(
            'input[type="hidden"]'
        );


    const selectedText =
        customSelect.querySelector(
            ".selected-text"
        );


    const options =
        customSelect.querySelectorAll(
            ".select-option"
        );


    if (hiddenInput) {

        hiddenInput.value =
            value ||
            "";

    }


    let selectedOption =
        null;


    options.forEach(
        function (
            option
        ) {

            if (
                option.dataset.value ===
                value
            ) {

                selectedOption =
                    option;

            }

        }
    );


    if (selectedText) {

        if (selectedOption) {

            const label =
                selectedOption.querySelector(
                    "span"
                );


            selectedText.textContent =
                label
                    ? label.textContent.trim()
                    : value;


            selectedText.style.color =
                "#ffffff";

        } else {

            selectedText.textContent =
                selectId ===
                    "secondaryFightingStyleSelect"
                    ? "None"
                    : "Choose your main fighting style";


            selectedText.style.color =
                "";

        }

    }

}


/* =========================================================
   CLOSE OTHER SELECTS
   ========================================================= */

function closeOtherSelects(
    currentSelect = null
) {

    const selects =
        document.querySelectorAll(
            ".custom-select"
        );


    selects.forEach(
        function (
            select
        ) {

            if (
                currentSelect === null ||
                select !== currentSelect
            ) {

                select.classList.remove(
                    "open"
                );


                const trigger =
                    select.querySelector(
                        ".select-trigger"
                    );


                if (trigger) {

                    trigger.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }

        }
    );

}


/* =========================================================
   PREVIOUS CLAN
   ========================================================= */

function initPreviousClan() {

    const pastGang =
        document.getElementById(
            "pastGang"
        );


    const previousClanGroup =
        document.getElementById(
            "previousClanGroup"
        );


    const reasonGroup =
        document.getElementById(
            "reasonGroup"
        );


    const previousClan =
        document.getElementById(
            "previousClan"
        );


    const reason =
        document.getElementById(
            "reason"
        );


    if (
        !pastGang ||
        !previousClanGroup ||
        !reasonGroup ||
        !previousClan ||
        !reason
    ) {

        return;

    }


    function updatePreviousClanFields() {

        const hasPreviousClan =
            pastGang.value ===
            "Yes";


        previousClanGroup.classList.toggle(
            "show",
            hasPreviousClan
        );


        reasonGroup.classList.toggle(
            "show",
            hasPreviousClan
        );


        previousClan.required =
            hasPreviousClan;


        reason.required =
            hasPreviousClan;


        if (!hasPreviousClan) {

            previousClan.value =
                "";

            reason.value =
                "";

        }

    }


    pastGang.addEventListener(
        "change",
        updatePreviousClanFields
    );


    updatePreviousClanFields();

}


/* =========================================================
   APPLICATION DISCORD LOGIN
   ========================================================= */

function initApplicationDiscordLogin() {

    const auth =
        document.getElementById(
            "applicationAuth"
        );


    const loginButton =
        document.getElementById(
            "applicationLoginButton"
        );


    const logoutButton =
        document.getElementById(
            "applicationLogoutButton"
        );


    const message =
        document.getElementById(
            "applicationAuthMessage"
        );


    const userLabel =
        document.getElementById(
            "applicationAuthUser"
        );


    if (!auth) {

        return;

    }


    fetch(
        "/api/me",
        {

            method:
                "GET",

            credentials:
                "include",

            headers: {

                Accept:
                    "application/json"

            },

            cache:
                "no-store"

        }
    )
        .then(
            response =>
                response.ok
                    ? response.json()
                    : {
                        loggedIn:
                            false
                    }
        )
        .then(
            data => {

                if (
                    data &&
                    data.loggedIn &&
                    data.user
                ) {

                    const displayName =
                        data.user.globalName ||
                        data.user.username ||
                        "Discord user";


                    auth.classList.add(
                        "is-logged-in"
                    );


                    const authTitle =
                        document.getElementById(
                            "applicationAuthTitle"
                        );


                    if (authTitle) {

                        authTitle.textContent =
                            "DISCORD ACCOUNT CONNECTED";

                    }


                    if (message) {

                        message.hidden =
                            true;

                    }


                    if (userLabel) {

                        userLabel.textContent =
                            `LOGGED IN AS ${displayName}`;


                        userLabel.hidden =
                            false;

                    }


                    if (loginButton) {

                        loginButton.hidden =
                            true;

                    }


                    if (logoutButton) {

                        logoutButton.hidden =
                            false;

                    }

                }

            }
        )
        .catch(
            () => {

                // Keep login button available
                // if the status check fails.

            }
        );

}


/* =========================================================
   APPLICATION FORM
   ========================================================= */

let kyokenApplicationStatusStarted = false;

function getApplicationResultElements() {
    return {
        overlay: document.getElementById("applicationResultOverlay") || document.getElementById("successOverlay"),
        title: document.getElementById("applicationResultTitle"),
        message: document.getElementById("applicationResultMessage"),
        icon: document.getElementById("applicationResultIcon"),
        actions: document.getElementById("applicationInviteActions"),
        join: document.getElementById("joinKyokenButton"),
        close: document.getElementById("applicationResultClose")
    };
}

function showApplicationResult(status, application) {
    const el = getApplicationResultElements();
    if (!el.overlay) return;
    const normalized = String(status || "").toUpperCase();
    const accepted = normalized === "ACCEPTED";
    const rejected = normalized === "REJECTED";
    if (el.icon) el.icon.textContent = accepted ? "🐺" : rejected ? "✕" : "◆";
    if (el.title) el.title.textContent = accepted ? "APPLICATION ACCEPTED!" : rejected ? "APPLICATION REJECTED" : "APPLICATION SUBMITTED!";
    if (el.message) el.message.textContent = accepted
        ? "Congratulations! Your application has been accepted. Click JOIN KYŌKEN below to use your personal invitation."
        : rejected
            ? "We're sorry, but your application has been rejected at this time. Thank you for applying to KYŌKEN CLAN."
            : "Your application has been submitted successfully. Please wait while our officers review it.";
    if (el.actions) el.actions.style.display = accepted && application?.invite_url ? "block" : "none";
    if (el.join) el.join.onclick = function () { if (application?.invite_url) window.open(application.invite_url, "_blank", "noopener,noreferrer"); };
    el.overlay.classList.add("active");
    el.overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeApplicationResult() {
    const el = getApplicationResultElements();
    if (!el.overlay) return;
    el.overlay.classList.remove("active");
    el.overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

async function checkMyApplicationStatus() {
    try {
        const response = await fetch("/api/applications/mine", { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const application = data?.application;
        if (!application) return;
        const status = String(application.status || "").toUpperCase();
        if (status !== "ACCEPTED" && status !== "REJECTED") return;
        const key = `kyoken-application-result-${application.id}-${status}`;
        if (sessionStorage.getItem(key) === "shown") return;
        sessionStorage.setItem(key, "shown");
        showApplicationResult(status, application);
    } catch (error) { console.error("Kyōken application status check failed:", error); }
}

function startApplicationStatusWatcher() {
    if (kyokenApplicationStatusStarted) return;
    kyokenApplicationStatusStarted = true;
    checkMyApplicationStatus();
    window.setInterval(checkMyApplicationStatus, 8000);
    const el = getApplicationResultElements();
    if (el.close) el.close.addEventListener("click", closeApplicationResult);
    if (el.overlay) el.overlay.addEventListener("click", function (event) { if (event.target === el.overlay) closeApplicationResult(); });
}

function initApplicationForm() {

    const form =
        document.getElementById(
            "applicationForm"
        );


    const successOverlay =
        document.getElementById(
            "applicationResultOverlay"
        ) ||
        document.getElementById(
            "successOverlay"
        );


    if (!form) {

        return;

    }


    if (
        form.dataset.initialized ===
        "true"
    ) {

        return;

    }


    form.dataset.initialized =
        "true";


    startApplicationStatusWatcher();


    form.addEventListener(
        "submit",
        async function (
            event
        ) {

            event.preventDefault();


            if (
                !form.checkValidity()
            ) {

                form.reportValidity();

                return;

            }


            const gender =
                document.getElementById(
                    "gender"
                )?.value.trim() ||
                "";


            const age =
                Number(
                    document.getElementById(
                        "age"
                    )?.value
                );


            const ign =
                document.getElementById(
                    "ign"
                )?.value.trim() ||
                "";


            const mainStyle =
                form.querySelector(
                    'input[name="mainStyle"]'
                )?.value.trim() ||
                "";


            const secondaryStyle =
                form.querySelector(
                    'input[name="secondaryStyle"]'
                )?.value.trim() ||
                "";


            const device =
                document.getElementById(
                    "device"
                )?.value.trim() ||
                "";


            const microphone =
                document.getElementById(
                    "microphone"
                )?.value.trim() ||
                "";


            const pastGang =
                document.getElementById(
                    "pastGang"
                )?.value.trim() ||
                "";


            const previousClan =
                document.getElementById(
                    "previousClan"
                )?.value.trim() ||
                "";


            const reason =
                document.getElementById(
                    "reason"
                )?.value.trim() ||
                "";


            if (!microphone) {

                showApplicationMessage(
                    "Please select whether you have a working microphone.",
                    "error"
                );

                return;

            }


            if (!mainStyle) {

                showApplicationMessage(
                    "Please select your MAIN FIGHTING STYLE.",
                    "error"
                );

                return;

            }


            if (
                secondaryStyle &&
                mainStyle ===
                    secondaryStyle
            ) {

                showApplicationMessage(
                    "Main and secondary fighting styles cannot be the same.",
                    "error"
                );

                return;

            }


            if (
                pastGang ===
                "Yes"
            ) {

                if (!previousClan) {

                    showApplicationMessage(
                        "Please enter your previous clan / gang name.",
                        "error"
                    );

                    return;

                }


                if (!reason) {

                    showApplicationMessage(
                        "Please explain why you left your previous clan / gang.",
                        "error"
                    );

                    return;

                }

            }


            const submitButton =
                form.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled =
                    true;


                submitButton.style.opacity =
                    "0.55";

            }


            showApplicationMessage(
                "SUBMITTING APPLICATION...",
                ""
            );


            try {

                const meResponse =
                    await fetch(
                        "/api/me",
                        {

                            method:
                                "GET",

                            credentials:
                                "include",

                            headers: {

                                Accept:
                                    "application/json"

                            },

                            cache:
                                "no-store"

                        }
                    );


                const meData =
                    await meResponse.json();


                if (
                    !meResponse.ok ||
                    !meData.loggedIn
                ) {

                    throw new Error(
                        "Please log in with Discord before submitting your application. Use the LOGIN WITH DISCORD button above."
                    );

                }


                const applicationData = {

                    gender:
                        gender,

                    age:
                        age,

                    ign:
                        ign,

                    mainStyle:
                        mainStyle,

                    secondaryStyle:
                        secondaryStyle,

                    device:
                        device,

                    microphone:
                        microphone,

                    pastGang:
                        pastGang,

                    previousClan:
                        pastGang ===
                        "Yes"
                            ? previousClan
                            : "",

                    reason:
                        pastGang ===
                        "Yes"
                            ? reason
                            : ""

                };


                const response =
                    await fetch(
                        "/api/applications",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                Accept:
                                    "application/json"

                            },

                            credentials:
                                "include",

                            body:
                                JSON.stringify(
                                    applicationData
                                )

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Application submission failed."
                    );

                }


                console.log(
                    "Kyōken application submitted:",
                    data
                );


                if (successOverlay) {

                    showApplicationResult("PENDING", data.application);

                } else {

                    showApplicationMessage(
                        "APPLICATION SUBMITTED SUCCESSFULLY.",
                        "success"
                    );

                }


                form.reset();

            } catch (error) {

                console.error(
                    "Kyōken application submission failed:",
                    error
                );


                showApplicationMessage(
                    error.message ||
                    "Unable to submit your application.",
                    "error"
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;


                    submitButton.style.opacity =
                        "";

                }

            }

        }
    );

}


/* =========================================================
   APPLICATION MESSAGE
   ========================================================= */

function showApplicationMessage(
    message,
    type
) {

    let messageBox =
        document.getElementById(
            "applicationMessage"
        );


    if (!messageBox) {

        messageBox =
            document.getElementById(
                "profileMessage"
            );

    }


    if (!messageBox) {

        if (
            type === "error" &&
            message
        ) {

            alert(
                message
            );

        }

        return;

    }


    messageBox.textContent =
        message ||
        "";


    messageBox.className =
        messageBox.id ===
            "profileMessage"
            ? "profile-message"
            : "application-message";


    if (type) {

        messageBox.classList.add(
            type
        );

    }

}


/* =========================================================
   PROFILE PAGE
   ========================================================= */

async function initProfilePage() {

    const profileContainer =
        document.getElementById(
            "profileContainer"
        );


    if (!profileContainer) {

        return;

    }


    const profileContent =
        document.getElementById(
            "profileContent"
        );


    const profileDenied =
        document.getElementById(
            "profileDenied"
        );


    const profileStatus =
        document.getElementById(
            "profileStatus"
        );


    profileContainer.classList.add(
        "loading"
    );


    try {

        const response =
            await fetch(
                "/api/profile/me",
                {

                    method:
                        "GET",

                    headers: {

                        Accept:
                            "application/json"

                    },

                    credentials:
                        "include",

                    cache:
                        "no-store"

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            if (profileContent) {

                profileContent.style.display =
                    "none";

            }


            if (profileStatus) {

                profileStatus.classList.remove(
                    "success"
                );


                profileStatus.classList.add(
                    "error"
                );


                profileStatus.innerHTML = `

                    <span>
                        ACCESS DENIED
                    </span>

                `;

            }


            if (profileDenied) {

                profileDenied.hidden =
                    false;

            }


            const deniedMessage =
                document.getElementById(
                    "profileDeniedMessage"
                );


            if (
                deniedMessage &&
                data.error
            ) {

                deniedMessage.textContent =
                    data.error;

            }


            return;

        }


        const profile =
            data.profile;


        if (!profile) {

            throw new Error(
                "Profile data was not returned."
            );

        }


        if (profileStatus) {

            profileStatus.classList.remove(
                "error"
            );


            profileStatus.classList.add(
                "success"
            );


            profileStatus.innerHTML = `

                <span>
                    VERIFIED —
                    ${escapeHTML(
                        profile.positionName ||
                        "KYŌKEN OFFICER"
                    )}
                </span>

            `;

        }


        const displayName =
            document.getElementById(
                "displayName"
            );


        const discordUsername =
            document.getElementById(
                "discordUsername"
            );


        const positionName =
            document.getElementById(
                "positionName"
            );


        const description =
            document.getElementById(
                "description"
            );


        if (displayName) {

            displayName.value =
                profile.displayName ||
                "";

        }


        if (discordUsername) {

            discordUsername.value =
                profile.discordUsername ||
                "";

        }


        if (positionName) {

            positionName.value =
                profile.positionName ||
                "";

        }


        if (description) {

            description.value =
                profile.description ||
                "";

        }


        setCustomFightingStyle(
            "mainFightingStyleSelect",
            profile.fightingStyle ===
                "—"
                ? ""
                : (
                    profile.fightingStyle ||
                    ""
                )
        );


        setCustomFightingStyle(
            "secondaryFightingStyleSelect",
            profile.secondaryFightingStyle ||
            ""
        );


        if (
            profile.profileImage
        ) {

            setProfileImage(
                profile.profileImage
            );

        }


        const permissions =
            profile.permissions ||
            {};


        if (
            !permissions.editOwnProfile
        ) {

            if (profileContent) {

                profileContent.style.display =
                    "none";

            }


            if (profileStatus) {

                profileStatus.classList.remove(
                    "success"
                );


                profileStatus.classList.add(
                    "error"
                );


                profileStatus.innerHTML = `

                    <span>
                        PROFILE EDITING NOT AUTHORIZED
                    </span>

                `;

            }


            if (profileDenied) {

                profileDenied.hidden =
                    false;

            }


            return;

        }


        if (profileContent) {

            profileContent.style.display =
                "block";

        }


        if (profileDenied) {

            profileDenied.hidden =
                true;

        }


        initProfileImagePreview();

        initProfileForm();

    } catch (error) {

        console.error(
            "Kyōken profile loading failed:",
            error
        );


        if (profileStatus) {

            profileStatus.classList.remove(
                "success"
            );


            profileStatus.classList.add(
                "error"
            );


            profileStatus.innerHTML = `

                <span>
                    PROFILE SYSTEM ERROR
                </span>

            `;

        }

    } finally {

        profileContainer.classList.remove(
            "loading"
        );

    }

}


/* =========================================================
   PROFILE IMAGE PREVIEW
   ========================================================= */

function initProfileImagePreview() {

    const imageInput =
        document.getElementById(
            "profileImageInput"
        );


    if (!imageInput) {

        return;

    }


    if (
        imageInput.dataset.initialized ===
        "true"
    ) {

        return;

    }


    imageInput.dataset.initialized =
        "true";


    imageInput.addEventListener(
        "change",
        function () {

            const file =
                imageInput.files[0];


            if (!file) {

                return;

            }


            const allowedTypes = [

                "image/jpeg",
                "image/png",
                "image/webp"

            ];


            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {

                showProfileMessage(
                    "Please choose a JPG, PNG, or WEBP image.",
                    "error"
                );


                imageInput.value =
                    "";

                return;

            }


            if (
                file.size >
                5 * 1024 * 1024
            ) {

                showProfileMessage(
                    "Profile picture must be 5 MB or smaller.",
                    "error"
                );


                imageInput.value =
                    "";

                return;

            }


            selectedProfileImage =
                file;


            const reader =
                new FileReader();


            reader.onload =
                function (
                    event
                ) {

                    setProfileImage(
                        event.target.result
                    );


                    showProfileMessage(
                        "Picture selected. Click SAVE PROFILE to upload it.",
                        ""
                    );

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


/* =========================================================
   SET PROFILE IMAGE
   ========================================================= */

function setProfileImage(
    imageSource
) {

    const image =
        document.getElementById(
            "profileImage"
        );


    const picture =
        document.getElementById(
            "profilePicture"
        );


    if (
        !image ||
        !picture
    ) {

        return;

    }


    image.src =
        imageSource;


    picture.classList.add(
        "has-image"
    );

}


/* =========================================================
   PROFILE FORM
   ========================================================= */

function initProfileForm() {

    const form =
        document.getElementById(
            "profileForm"
        );


    if (!form) {

        return;

    }


    if (
        form.dataset.initialized ===
        "true"
    ) {

        return;

    }


    form.dataset.initialized =
        "true";


    form.addEventListener(
        "submit",
        async function (
            event
        ) {

            event.preventDefault();


            const displayName =
                document.getElementById(
                    "displayName"
                );


            const mainFightingStyle =
                document.getElementById(
                    "mainFightingStyle"
                );


            const secondaryFightingStyle =
                document.getElementById(
                    "secondaryFightingStyle"
                );


            const description =
                document.getElementById(
                    "description"
                );


            const imageInput =
                document.getElementById(
                    "profileImageInput"
                );


            const saveButton =
                document.getElementById(
                    "saveProfileButton"
                );


            const displayNameValue =
                displayName
                    ? displayName.value.trim()
                    : "";


            const mainStyleValue =
                mainFightingStyle
                    ? mainFightingStyle.value.trim()
                    : "";


            const secondaryStyleValue =
                secondaryFightingStyle
                    ? secondaryFightingStyle.value.trim()
                    : "";


            const descriptionValue =
                description
                    ? description.value.trim()
                    : "";


            if (!displayNameValue) {

                showProfileMessage(
                    "Display name cannot be empty.",
                    "error"
                );

                return;

            }


            if (!mainStyleValue) {

                showProfileMessage(
                    "Please choose your MAIN FIGHTING STYLE.",
                    "error"
                );

                return;

            }


            if (
                secondaryStyleValue &&
                mainStyleValue ===
                    secondaryStyleValue
            ) {

                showProfileMessage(
                    "Main and secondary fighting styles cannot be the same.",
                    "error"
                );

                return;

            }


            if (
                descriptionValue.length >
                500
            ) {

                showProfileMessage(
                    "Profile description cannot exceed 500 characters.",
                    "error"
                );

                return;

            }


            if (saveButton) {

                saveButton.disabled =
                    true;


                saveButton.style.opacity =
                    "0.55";

            }


            showProfileMessage(
                "SAVING PROFILE...",
                ""
            );


            try {

                const formData =
                    new FormData();


                formData.append(
                    "displayName",
                    displayNameValue
                );


                formData.append(
                    "fightingStyle",
                    mainStyleValue
                );


                formData.append(
                    "secondaryFightingStyle",
                    secondaryStyleValue
                );


                formData.append(
                    "description",
                    descriptionValue
                );


                if (
                    imageInput &&
                    imageInput.files &&
                    imageInput.files.length
                ) {

                    formData.append(
                        "profileImage",
                        imageInput.files[0]
                    );

                }


                const response =
                    await fetch(
                        "/api/profile/me",
                        {

                            method:
                                "POST",

                            credentials:
                                "include",

                            body:
                                formData

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Profile update failed."
                    );

                }


                const updated =
                    data.profile ||
                    {};


                if (displayName) {

                    displayName.value =
                        updated.displayName ||
                        displayNameValue;

                }


                setCustomFightingStyle(
                    "mainFightingStyleSelect",
                    updated.fightingStyle ||
                    mainStyleValue
                );


                setCustomFightingStyle(
                    "secondaryFightingStyleSelect",
                    updated.secondaryFightingStyle ||
                    ""
                );


                if (description) {

                    description.value =
                        updated.description ||
                        "";

                }


                if (
                    updated.profileImage
                ) {

                    setProfileImage(
                        updated.profileImage +
                        "?t=" +
                        Date.now()
                    );

                }


                if (imageInput) {

                    imageInput.value =
                        "";

                }


                selectedProfileImage =
                    null;


                showProfileMessage(
                    "PROFILE SAVED SUCCESSFULLY.",
                    "success"
                );

            } catch (error) {

                console.error(
                    "Kyōken profile update failed:",
                    error
                );


                showProfileMessage(
                    error.message ||
                    "Unable to save your profile.",
                    "error"
                );

            } finally {

                if (saveButton) {

                    saveButton.disabled =
                        false;


                    saveButton.style.opacity =
                        "";

                }

            }

        }
    );

}


/* =========================================================
   PROFILE MESSAGE
   ========================================================= */

function showProfileMessage(
    message,
    type
) {

    const messageBox =
        document.getElementById(
            "profileMessage"
        );


    if (!messageBox) {

        return;

    }


    messageBox.textContent =
        message ||
        "";


    messageBox.className =
        "profile-message";


    if (type) {

        messageBox.classList.add(
            type
        );

    }

}


/* =========================================================
   SUCCESS OVERLAY
   ========================================================= */

function closeSuccess() {

    closeApplicationResult();

}


/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    function (
        event
    ) {

        if (
            event.key ===
            "Escape"
        ) {

            closeOfficer();

            closeSuccess();

        }

    }
);


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(
    value
) {

    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   MANAGEMENT LEFT SLIDE DRAWER
   ========================================================= */

async function initManagementDrawer() {

    const tab =
        document.getElementById(
            "managementTab"
        );

    const drawer =
        document.getElementById(
            "managementDrawer"
        );

    const close =
        document.getElementById(
            "managementDrawerClose"
        );

    const backdrop =
        document.getElementById(
            "managementBackdrop"
        );


    if (
        !tab ||
        !drawer ||
        !close ||
        !backdrop
    ) {

        return;

    }


    /* ---------------------------------------------------------
       ALWAYS HIDE MANAGEMENT FIRST
       --------------------------------------------------------- */

    tab.hidden = true;

    tab.classList.remove(
        "is-open"
    );

    drawer.classList.remove(
        "is-open"
    );

    backdrop.classList.remove(
        "is-visible"
    );

    document.body.classList.remove(
        "management-drawer-open"
    );

    tab.setAttribute(
        "aria-expanded",
        "false"
    );

    drawer.setAttribute(
        "aria-hidden",
        "true"
    );

    backdrop.setAttribute(
        "aria-hidden",
        "true"
    );


    /* ---------------------------------------------------------
       CHECK DISCORD LOGIN + MANAGEMENT PERMISSION
       
       ONLY THESE POSITIONS ARE ALLOWED:
       - LEADER
       - VICE LEADER
       - SECRETARY
       - ADMIN
       --------------------------------------------------------- */

    try {

        const response =
            await fetch(
                "/api/command/access",
                {

                    method:
                        "GET",

                    credentials:
                        "include",

                    cache:
                        "no-store",

                    headers: {

                        Accept:
                            "application/json"

                    }

                }
            );


        /*
           If the request fails, stay hidden.
        */

        if (!response.ok) {

            tab.hidden = true;

            return;

        }


        const data =
            await response.json();


        /*
           The user must actually be logged in.
        */

        if (
            !data ||
            data.loggedIn !== true
        ) {

            tab.hidden = true;

            return;

        }


        /*
           IMPORTANT:
           Do NOT rely only on data.authorized because the
           backend currently also considers Division Captains
           authorized.

           We explicitly allow only the four positions wanted.
        */

        const allowedPositions = [

            "leader",

            "viceleader",

            "secretary",

            "admins"

        ];


        const userPosition =
            String(
                data.position ||
                ""
            ).toLowerCase();


        const allowed =
            allowedPositions.includes(
                userPosition
            );


        /*
           Not one of the four allowed positions?
           Keep Management completely hidden.
        */

        if (!allowed) {

            tab.hidden = true;

            return;

        }


        /*
           User is authorized.
           Show the Management tab.
        */

        tab.hidden = false;


        const welcome =
            document.getElementById(
                "managementWelcome"
            );


        if (welcome) {

            welcome.textContent =
                data.positionName
                    ? `${data.positionName} • KYŌKEN STAFF`
                    : "KYŌKEN STAFF CONTROL CENTER";

        }


    } catch (error) {

        console.debug(
            "Kyōken management drawer access check failed:",
            error
        );


        /*
           Any error = hidden.
        */

        tab.hidden = true;

        return;

    }


    /* =========================================================
       DRAWER OPEN / CLOSE
       ========================================================= */

    const setOpen =
        function (
            open
        ) {

            /*
               Safety check:
               Never allow the drawer to open if the tab
               is currently hidden.
            */

            if (
                tab.hidden
            ) {

                open = false;

            }


            tab.classList.toggle(
                "is-open",
                open
            );


            drawer.classList.toggle(
                "is-open",
                open
            );


            backdrop.classList.toggle(
                "is-visible",
                open
            );


            document.body.classList.toggle(
                "management-drawer-open",
                open
            );


            tab.setAttribute(
                "aria-expanded",
                String(
                    open
                )
            );


            drawer.setAttribute(
                "aria-hidden",
                String(
                    !open
                )
            );


            backdrop.setAttribute(
                "aria-hidden",
                String(
                    !open
                )
            );

        };


    /* =========================================================
       MANAGEMENT TAB
       ========================================================= */

    tab.addEventListener(
        "click",
        function () {

            /*
               Extra protection.
            */

            if (
                tab.hidden
            ) {

                return;

            }


            setOpen(
                !drawer.classList.contains(
                    "is-open"
                )
            );

        }
    );


    /* =========================================================
       CLOSE BUTTON
       ========================================================= */

    close.addEventListener(
        "click",
        function () {

            setOpen(
                false
            );

        }
    );


    /* =========================================================
       BACKDROP
       ========================================================= */

    backdrop.addEventListener(
        "click",
        function () {

            setOpen(
                false
            );

        }
    );


    /* =========================================================
       ESCAPE KEY
       ========================================================= */

    document.addEventListener(
        "keydown",
        function (
            event
        ) {

            if (
                event.key ===
                "Escape"
            ) {

                setOpen(
                    false
                );

            }

        }
    );


    /* =========================================================
       MANAGEMENT NAVIGATION LINKS
       ========================================================= */

    document
        .querySelectorAll(
            ".management-scroll-link"
        )
        .forEach(
            function (
                link
            ) {

                link.addEventListener(
                    "click",
                    function () {

                        setOpen(
                            false
                        );

                    }
                );

            }
        );

}
