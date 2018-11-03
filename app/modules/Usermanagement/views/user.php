<section class="app">

    <div class="sidebar">

    </div>

    <div class="content">

        <div class="error">

        </div>

        <div class="user-form">

            <p>Account gegevens:</p>

            <label for="username">Gebruikersnaam: *</label>
            <input type="text" id="username" autocomplete="off" value="<?php echo $var['user']['username']; ?>">

            <label for="password">Wachtwoord:</label>
            <input type="password" id="password" autocomplete="off">

            <label for="password-repeat">Herhaal wachtwoord:</label>
            <input type="password" id="password-repeat" autocomplete="off">

            <label for="rol">Rol</label>

            <select id="role">

                <option value="1" <?php echo $var['user']['role'] == 1 ? 'selected' : null; ?>>Leerling</option>
                <option value="10" <?php echo $var['user']['role'] == 10 ? 'selected' : null; ?>>Leerkracht</option>
                <option value="50" <?php echo $var['user']['role'] == 100 ? 'selected' : null; ?>>Administratief</option>
                <option value="5" <?php echo $var['user']['role'] == 5 ? 'selected' : null; ?>>Andere</option>

            </select>

            <div class="checkbox">

               Wachtwoord wijzigen: <input type="checkbox" id="forcedPasswordChange">

            </div>

            <p>Andere gegevens</p>

            <label for="firstname">Voornaam: *</label>
            <input type="text" id="firstname" value="<?php echo $var['user']['firstname']; ?>" autocomplete="off">

            <label for="lastname">Achternaam: *</label>
            <input type="text" id="lastname" value="<?php echo $var['user']['lastname']; ?>" autocomplete="off">

            <label for="extranames">Extra namen:</label>
            <input type="text" id="extranames" value="<?php echo $var['user']['extranames']; ?>" autocomplete="off">

            <label for="initialen">Naam initialen:</label>
            <input type="text" id="initialen" value="<?php echo $var['user']['initialen']; ?>" autocomplete="off">

            <label for="email">Email:</label>
            <input type="email" id="email" value="<?php echo $var['user']['email']; ?>"  autocomplete="off">

            <label for="phone">Telefoon:</label>
            <input type="text" id="phone" value="<?php echo $var['user']['phone']; ?>" autocomplete="off">

            <label for="street">Straat:</label>
            <input type="street" id="street" value="<?php echo $var['user']['street']; ?>" autocomplete="off">

            <label for="housenr">Huisnummer:</label>
            <input type="text" id="housenr" value="<?php echo $var['user']['housenr']; ?>" autocomplete="off">

            <label for="postalcode">Postcode:</label>
            <input type="text" id="postalcode" value="<?php echo $var['user']['postalcode']; ?>" autocomplete="off">

            <label for="city">Gemeente:</label>
            <input type="text" id="city" value="<?php echo $var['user']['city']; ?>" autocomplete="off">

            <label for="dob">Geboortedatum:</label>
            <input type="date" id="dob" value="<?php echo $var['user']['dob']; ?>" autocomplete="off">

            <label for="birthplace">Geboorteplaats:</label>
            <input type="text" id="birthplace" value="<?php echo $var['user']['birthplace']; ?>" autocomplete="off">

            <label for="birthcountry">Geboorteland:</label>
            <input type="text" id="birthcountry" value="<?php echo $var['user']['birthcountry']; ?>" autocomplete="off">

            <div class="buttons">
            <button id="save" class="btn blue">Opslaan!</button>
            </div>

        </div>

    </div>

</section>

<script>

    var Schoolbase = {currentUserID: "<?php echo $var['currentUserID']; ?>", groupID: <?php echo $var['groupID']; ?>}

</script>

<script src="/src/schoolbase/usermanagement/dist/createuser.min.js?s=<?php echo time();?>"></script>