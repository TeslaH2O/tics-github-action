package PREPAREQDB;

use TIOBEPragma;

use Exception qw(:all);

use TICSAccess;
use TICSSystem;
use TIOBEFiles;

sub main ($$$) : Public {
  my ($project, $branchdir, $branchname) = @_;

  my $ret;
  print "------------------------------------------------------------------------\n";
  try {
    &TICSSystem::Assert(defined $project && defined $branchdir && defined $branchname, 5000, "Please provide the correct arguments for the Prepare script: (1) Projectname, (2) Branch directory, (3) Branch name");
    &Print("Preparing TICS run for project '$project', branch '$branchname', branchdir '$branchdir'");
    &PrepareQDB($project, $branchdir, $branchname);
    &Print("Project '$project' has been successfully prepared");
    $ret = 0;
  } except {
    my $err = shift;
    my $errstring = $err->stringify;

    &PrintError($errstring);
    $ret = $errstring;
  };
  print "------------------------------------------------------------------------\n";
  return $ret;
}

sub PrepareQDB ($$$) : Private {
  my ($project, $branchdir, $branchname) = @_;

  #create your prepare steps here
}

sub HandleError ($) : Private {
  my ($errmsg) = @_;

  die ($errmsg);
}

sub PrintError ($) : Private {
  my ($text) = @_;

  &TICSSystem::Print("  [ERROR]: $text\n");
}

sub Print ($) : Private {
  my ($text) = @_;
  my $out = "  [INFO] $text\n";

  &TICSSystem::Print($out);
}

1;
