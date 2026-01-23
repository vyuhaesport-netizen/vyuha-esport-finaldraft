import vyuhaLogo from '@/assets/vyuha-logo.png';

interface CroppedLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20'
};

const CroppedLogo = ({ size = 'md', className = '' }: CroppedLogoProps) => {
  return (
    <img 
      src={vyuhaLogo} 
      alt="Vyuha Esport" 
      className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
    />
  );
};

export default CroppedLogo;
