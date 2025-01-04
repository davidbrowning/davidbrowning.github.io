$(document).ready(function () {
    $('#search-field').keyup(function () {
        const searchValue = $(this).val().toLowerCase();
        $('#recipe-list li').each(function () {
            const recipeName = $(this).text().toLowerCase();
            $(this).toggle(recipeName.includes(searchValue));
        });
    });

    $('#recipe-list li').click(function () {
        const selectedRecipe = $(this).data('recipe');
        $.getJSON(selectedRecipe, function (recipe) {
            const html = `
                <h2>${recipe.name}</h2>
                <h3>Ingredients:</h3>
                <ul>
                    ${recipe.ingredients.map(ingredient => 
                        `<li>${ingredient.quantity || ''} ${ingredient.name || ingredient}</li>`).join('')}
                </ul>
                <h3>Steps:</h3>
                <ol>
                    ${recipe.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
            `;
            $('#recipe-details').html(html).show();
        });

        $('#recipe-list li').removeClass('highlighted');
        $(this).addClass('highlighted');
        $('#back-button').removeClass('hidden');
    });

    $('#back-button').click(function () {
        $('#recipe-details').hide();
        $('#back-button').addClass('hidden');
    });
});
