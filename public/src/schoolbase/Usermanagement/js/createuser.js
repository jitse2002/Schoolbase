/*
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 2/11/18 10:39
 */

/**
 * Created by Gebruiker on 2/11/2018.
 */

    $('header').remove();

    $('head').append("<link href=\"/src/schoolbase/Usermanagement/dist/createuser.min.css?=" + new Date().getMilliseconds() + "\" type=\"text/css\" rel=\"stylesheet\"> ");

    $('#save').on('click', function () {

        var username = $('#username').val();
        var password = $('#password').val();
        var passwordRepeat = $('#password-repeat').val();
        var role = $('#role').val();
        var email = $('#email').val();
        var phone = $('#phone').val();
        var firstname = $('#firstname').val();
        var lastname = $('#lastname').val();
        var extranames = $('#extranames').val();
        var initialen = $('#initialen').val();
        var street = $('#street').val();
        var housenr = $('#housenr').val();
        var postalcode = $('#postalcode').val();
        var city = $('#city').val();
        var dob = $('#dob').val();
        var birthplace = $('#birthplace').val();
        var birthCountry = $('#birthcountry').val();
        var forcedPasswordChange = $('#forcedPasswordChange').is(":checked") ? 1 : 0;

        $.ajax({

            url: 'http://testschool.schoolbase.be/usermanagement/rest/v1/users/create',
            type: 'post',
            data: {
                userID: Schoolbase.currentUserID,
                groupID: Schoolbase.groupID,
                username: username,
                passwordRepeat: passwordRepeat,
                role: role, email: email,
                phone: phone,
                firstname: firstname,
                lastname: lastname,
                extranames: extranames,
                initialen: initialen,
                street: street,
                housenr: housenr,
                postalcode: postalcode,
                city: city,
                dob: dob,
                birthplace: birthplace,
                birthCountry: birthCountry,
                forcedPasswordChange: forcedPasswordChange
            },
            success: function (data) {

                if (data.success) {

                    $('.error').html(" ");

                    $('.error').addClass('green');

                    $('.error').append("<p>" + data.success.msg + "</p>");

                }

                if (data.error) {

                    $('.error').html(" ");

                    $('.error').addClass('red');

                    for (a = 0; a < data.error.msg.length; a++) {

                        $('.error').append("<p>" + data.error.msg[a] + "</p>");

                    }

                }

            }

        });

    });
