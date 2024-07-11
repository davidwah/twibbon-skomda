let shareData = {
        title: 'MPLS 2024 #SKOMDA',
        text: 'Your Journey to Excellence',
        // url: 'https://mpls2024.netlify.app/',
        url: 'https://twibbon.dwp.my.id/',
        // files: ['https://instagram.com/image.jpg']
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
