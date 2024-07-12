let shareData = {
        title: 'MPLS 2024 #SKOMDA',
        text: 'Your Journey to Excellence',
        // url: 'https://mpls-skomda-2024.netlify.app/',
        url: 'https://twbn.dwp.my.id/'
      }

      const btn = document.querySelector('em');
      const resultPara = document.querySelector('.result');

      btn.addEventListener('click', () => {
        navigator.share(shareData)
          .then(() =>
            resultPara.textContent = 'MPLS 2024 #SKOMDA shared successfully'
          )
          .catch((e) =>
            resultPara.textContent = 'Error: Share canceled!'
          )
      });
