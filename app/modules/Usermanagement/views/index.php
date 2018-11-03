<?php
/**
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 31/10/18 15:43
 */
?>

<section class="app">

    <div class="sidebar">

        <div id="tree">

            <ul id="groups">

            </ul>

        </div>

    </div>

    <div class="content">

        <div class="heading">

            <div class="search-form">

                <input type="text" placeholder="Zoek gebruiker">
                <div id="suggestion"></div>

            </div>

            <div class="create-section">

                <a href="#" id="create-group">Groep aanmaken</a>
                <a href="#" id="create-user">Gebruiker Toevoegen</a>

            </div>

        </div>

        <div id="load-users"></div>

    </div>

</section>

<script>

    var Schoolbase = {groupID:0, userID: 0};

</script>

<script src="/src/schoolbase/usermanagement/dist/app.min.js?s=<?php echo time();?>"></script>